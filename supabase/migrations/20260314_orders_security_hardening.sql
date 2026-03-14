-- Security hardening for orders table
-- Goal: prevent anonymous callers from updating paid/analysis fields directly.

-- Remove overly broad update policy
drop policy if exists "edge functions can update" on orders;

-- Tighten insert policy (keep public insert for current frontend flow, but only for fresh unpaid orders)
drop policy if exists "edge functions can insert" on orders;
create policy "public can insert unpaid bazi orders" on orders
  for insert
  to anon, authenticated
  with check (
    trade_no like 'bazi-%'
    and paid is false
    and analysis is null
    and length(trade_no) between 12 and 128
    and length(birth_input) between 2 and 20000
  );

-- NOTE:
-- We intentionally keep current select policy for now to avoid breaking existing customer flow.
-- Next phase can move all reads to edge functions and then remove broad select policy.
