import { NextRequest, NextResponse } from 'next/server';
import { createShareToken, verifyShareToken } from '@/lib/shareToken';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// POST: 10분 공유 토큰 생성
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: '공유할 파일 목록이 올바르지 않습니다.' },
        { status: 400 }
      );
    }

    const durationMinutes = 10;
    const { token, exp } = createShareToken(title || '공유된 파일', files, durationMinutes);

    return NextResponse.json({
      token,
      exp,
      expiresAt: new Date(exp).toISOString(),
    });
  } catch (error) {
    console.error('Failed to create share token:', error);
    return NextResponse.json(
      { error: '공유 링크를 생성하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// GET: 10분 공유 토큰 검증 및 다운로드 링크 발급
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: '토큰이 제공되지 않았습니다.' }, { status: 400 });
    }

    const result = verifyShareToken(token);

    if (!result.valid) {
      if (result.error === 'EXPIRED') {
        return NextResponse.json(
          {
            error: 'EXPIRED',
            message: '⏱️ 공유 링크의 유효 기간(10분)이 만료되었습니다.',
          },
          { status: 410 }
        );
      }
      return NextResponse.json(
        {
          error: 'INVALID',
          message: '유효하지 않거나 손상된 공유 링크입니다.',
        },
        { status: 400 }
      );
    }

    const { data } = result;
    if (!data) {
      return NextResponse.json({ error: '데이터를 읽을 수 없습니다.' }, { status: 400 });
    }

    // 남은 시간(초) 계산
    const remainingSeconds = Math.max(1, Math.floor((data.exp - Date.now()) / 1000));

    // 각 파일의 Supabase Storage 10분 만료 signedUrl 생성
    const filesWithSignedUrls = await Promise.all(
      data.files.map(async (file) => {
        try {
          const { data: signedData, error: signError } = await supabase.storage
            .from('files')
            .createSignedUrl(file.storagePath, remainingSeconds, {
              download: file.name,
            });

          return {
            name: file.name,
            size: file.size,
            storagePath: file.storagePath,
            downloadUrl: !signError && signedData?.signedUrl ? signedData.signedUrl : null,
          };
        } catch {
          return {
            name: file.name,
            size: file.size,
            storagePath: file.storagePath,
            downloadUrl: null,
          };
        }
      })
    );

    return NextResponse.json({
      valid: true,
      title: data.title,
      files: filesWithSignedUrls,
      exp: data.exp,
      remainingSeconds,
    });
  } catch (error) {
    console.error('Failed to verify share token:', error);
    return NextResponse.json(
      { error: '공유 링크를 검증하는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
