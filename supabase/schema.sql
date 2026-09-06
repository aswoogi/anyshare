-- =======================================================
-- AnyShare Supabase Production Schema & Security Policies
-- =======================================================

-- 1. Create items table
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  type text check (type in ('text', 'link', 'todo', 'file')) not null,
  title text,
  content text,                       -- 텍스트 메모 본문 or 링크 URL or 파일 저장 경로
  metadata jsonb default '{}'::jsonb,  -- 링크 OG 정보, 파일 메타, sort_order 등
  is_completed boolean default false,  -- todo 전용
  remind_at timestamptz,              -- 리마인드 일시
  expires_at timestamptz,             -- 파일 자동 만료 일시
  is_archived boolean default false,
  sort_order double precision,
  created_at timestamptz default now()
);

-- user_id nullable 허용 (비로그인 테스트 및 유연한 인증 지원)
alter table public.items alter column user_id drop not null;

-- 2. Row Level Security (RLS) 활성화
alter table public.items enable row level security;

-- 기존 정책 정리
drop policy if exists "Users can manage own items" on public.items;
drop policy if exists "Allow all access to items" on public.items;
drop policy if exists "Anonymous users access unassigned items" on public.items;

-- [보안 정책] 로그인(Authenticated) 사용자만 본인 데이터에 접근 (완전 격리)
create policy "Users can manage own items" on public.items
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. 실시간 동기화 (Realtime) 복제 활성화
alter publication supabase_realtime add table public.items;

-- 4. Supabase Storage (files 버킷) 설정 및 보안 정책
insert into storage.buckets (id, name, public)
values ('files', 'files', true)
on conflict (id) do nothing;

drop policy if exists "Allow authenticated upload" on storage.objects;
drop policy if exists "Allow authenticated read" on storage.objects;
drop policy if exists "Allow authenticated delete" on storage.objects;
drop policy if exists "Allow public upload to files" on storage.objects;
drop policy if exists "Allow public read files" on storage.objects;
drop policy if exists "Allow public delete from files" on storage.objects;

-- Storage: 로그인 사용자만 파일 업로드 및 삭제 허용
create policy "Allow authenticated upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'files');

create policy "Allow read files"
on storage.objects for select
to public
using (bucket_id = 'files');

create policy "Allow authenticated delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'files');

-- 5. 피드 성능을 위한 복합 인덱스
create index if not exists idx_items_user_order on public.items (user_id, is_archived, created_at desc);
create index if not exists idx_items_type on public.items (type);
create index if not exists idx_items_expires on public.items (expires_at) where expires_at is not null;
