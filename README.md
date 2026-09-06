# AnyShare - Personal Capture & Archive WebApp

Things 3와 Apple Notes 감성의 극도로 미니멀하고 빠른 개인용 올인원 캡처 & 아카이빙 웹앱입니다.

## ✨ Key Features
- **Smart Quick Input**: 텍스트, 링크, [ ] 할 일, 파일 드래그 앤 드롭 자동 감지
- **Global Paste (Ctrl+V)**: 웹페이지 어디서든 클립보드 내용 즉시 카드 등록
- **OpenGraph Link Preview**: 링크 붙여넣기 시 파비콘, 제목, 요약문, 썸네일 자동 파싱
- **TODO & Reminders**: 체크박스 애니메이션, 오늘 저녁/내일 오전 및 캘린더 날짜/시간 직접 지정
- **Temporary File Sharing**: Supabase Storage 업로드, 24시간 만료 카운트다운 배지
- **Inline Editing**: 카드별 제목, 본문, 리마인드 일시 인라인 수정 (`Ctrl+Enter`, `Esc`)
- **Category Filter**: 전체, 할 일, 링크, 메모, 파일별 미니멀 탭 필터링
- **Drag & Drop Reordering**: 카드 순서 자유 재배치 및 영구 보존
- **User Authentication**: Supabase Auth 연동 (로그인/회원가입 및 데이터 완전 격리)
- **Cross-device Realtime Sync**: Supabase Realtime 채널을 통한 멀티 디바이스 실시간 동기화
- **PWA & Web Share Target**: 모바일 홈 화면 추가 및 OS '공유하기' 지원

---

## 🚀 Deployment (Vercel 배포 가이드)

AnyShare는 Next.js 14 App Router 기반으로 제작되어 **Vercel**에 가장 완벽하게 호스팅됩니다.

### 1단계: GitHub에 코드 푸시
```bash
git init
git add .
git commit -m "feat: AnyShare all-in-one capture webapp"
git branch -M main
git remote add origin https://github.com/[YOUR_USERNAME]/anyshare.git
git push -u origin main
```

### 2단계: Vercel 배포
1. [Vercel](https://vercel.com) 로그인 후 **Add New... ➔ Project** 클릭
2. 방금 푸시한 `anyshare` 레포지토리 **Import**
3. **Environment Variables** 항목에 Supabase 환경변수 2개 입력:
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://[YOUR_PROJECT].supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `[YOUR_ANON_KEY]`
4. **Deploy** 버튼 클릭 ➔ 1분 내 전 세계 접속 가능한 무료 HTTPS 주소 발급!

---

## 🔒 Supabase Authentication & RLS 설정

Supabase SQL Editor에서 [`supabase/schema.sql`](supabase/schema.sql)을 실행하여 사용자별 데이터 격리 보안 정책을 적용하세요.

> **💡 빠른 회원가입 테스트 팁**:
> Supabase Dashboard ➔ **Authentication** ➔ **Providers** ➔ **Email** 에서 **Confirm email** 옵션을 꺼두시면, 가입 후 이메일 인증 절차 없이 즉시 로그인이 가능합니다.
