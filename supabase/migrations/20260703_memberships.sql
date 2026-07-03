-- 订阅会员：登录用户的会员有效期（月卡/年卡时长；PayPal 自动续订也写这里）
create table if not exists memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  plan text,                          -- 'monthly' | 'yearly'
  source text,                        -- 'cny_pass' | 'paypal_sub' | 'paypal_pass'
  paypal_subscription_id text,        -- PayPal 自动续订的订阅 ID（如有）
  auto_renew boolean default false,   -- 是否自动续订（PayPal 订阅为 true）
  status text default 'active',       -- 'active' | 'cancelled' | 'expired'
  expires_at timestamptz not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table memberships enable row level security;

-- 用户只能读自己的会员状态；写入只允许 service role（边缘函数），前端无写权限
drop policy if exists "users read own membership" on memberships;
create policy "users read own membership" on memberships
  for select using (auth.uid() = user_id);

create index if not exists memberships_expires_idx on memberships(expires_at);
create index if not exists memberships_paypal_sub_idx on memberships(paypal_subscription_id);
