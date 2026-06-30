-- 用户记录：登录用户保存自己的付费报告与占卜历史
create table if not exists user_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  email text,
  type text not null,                 -- 'bazi' | 'hepan' | 'zhanbu'
  title text,                         -- 简短标题（命主信息 / 所问之事）
  category text,                      -- 占卜问事类别
  question text,                      -- 占卜的问题
  meta jsonb,                         -- 卦象数字 / 生辰等结构化信息
  result_text text,                   -- 解读全文
  trade_no text,                      -- 关联付费订单（如有）
  created_at timestamptz default now()
);

alter table user_records enable row level security;

-- 用户只能读写自己的记录（按 auth.uid()）
drop policy if exists "users read own records" on user_records;
create policy "users read own records" on user_records
  for select using (auth.uid() = user_id);

drop policy if exists "users insert own records" on user_records;
create policy "users insert own records" on user_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "users delete own records" on user_records;
create policy "users delete own records" on user_records
  for delete using (auth.uid() = user_id);

create index if not exists user_records_user_idx on user_records(user_id, created_at desc);
