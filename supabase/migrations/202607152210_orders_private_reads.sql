-- Customer order data is accessed through the rate-limited order-access edge
-- function. Anonymous table reads exposed birth data and generated reports.
drop policy if exists "anyone can read own order" on public.orders;
