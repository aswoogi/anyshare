import crypto from 'crypto';
import { FileMetadata } from '@/types/item';

const SECRET_KEY =
  process.env.SHARE_SECRET_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'anyshare-secure-default-key-10m';

export interface SharePayload {
  title: string;
  files: {
    name: string;
    size: number;
    mimeType?: string;
    storagePath: string;
  }[];
  exp: number; // Unix timestamp in milliseconds
}

export interface VerifyResult {
  valid: boolean;
  error?: 'EXPIRED' | 'INVALID' | 'MALFORMED';
  data?: SharePayload;
}

/**
 * 10분(600초) 유효 기간을 가진 무상태 HMAC 서명 토큰 생성
 */
export function createShareToken(
  title: string,
  files: { name: string; size: number; mimeType?: string; storagePath: string }[],
  durationMinutes = 10
): { token: string; exp: number } {
  const exp = Date.now() + durationMinutes * 60 * 1000;
  const payload: SharePayload = {
    title,
    files,
    exp,
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(payloadB64)
    .digest('base64url');

  return {
    token: `${payloadB64}.${signature}`,
    exp,
  };
}

/**
 * 공유 토큰의 HMAC 서명 및 10분 만료 시간 검증
 */
export function verifyShareToken(token: string): VerifyResult {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) {
      return { valid: false, error: 'MALFORMED' };
    }

    const [payloadB64, providedSig] = parts;

    // 1. HMAC 서명 검증
    const expectedSig = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(payloadB64)
      .digest('base64url');

    const expectedBuffer = Buffer.from(expectedSig);
    const providedBuffer = Buffer.from(providedSig);

    if (
      expectedBuffer.length !== providedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)
    ) {
      return { valid: false, error: 'INVALID' };
    }

    // 2. 페이로드 디코딩
    const payloadStr = Buffer.from(payloadB64, 'base64url').toString('utf8');
    const data: SharePayload = JSON.parse(payloadStr);

    // 3. 만료 시간 검증 (10분)
    if (!data.exp || data.exp <= Date.now()) {
      return { valid: false, error: 'EXPIRED', data };
    }

    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: 'MALFORMED' };
  }
}
