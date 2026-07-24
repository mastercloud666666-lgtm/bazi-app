-- Purge all order data (one-off, 2026-07)
--
-- Requested explicitly, with the consequence acknowledged: this deletes records of
-- customers who already paid. Read this header before running any of it.
--
-- WHAT THIS DOES NOT DO
--   * It does not touch PayPal. Every transaction still exists in the PayPal dashboard,
--     which is where you will have to argue a dispute from once these rows are gone.
--     PayPal disputes stay open for up to 180 days.
--   * It does not delete auth.users. Accounts survive; their purchase history does not.
--   * It does not cancel anything. See the memberships note below.
--
-- WHAT YOU LOSE
--   * Who bought what, and for how much.
--   * order_intakes rows in status 'paid_ready' are paid $99 personal readings that were
--     promised inside 72h and not yet delivered. After this you cannot tell who they are.
--   * english_ai_reports holds the generated report text. Buyers lose access to reports
--     they paid for.
--   * The reconcile sweep loses its input: approved-but-uncaptured orders can no longer
--     be found and charged.
--
-- HOW TO RUN
--   1. Run STEP 1 alone and keep the output. It is the last record of what existed.
--   2. Run STEP 2. It is wrapped in a transaction that ends with ROLLBACK so you can see
--      the row counts without committing.
--   3. Only when the counts look right, change ROLLBACK to COMMIT and run it again.
--   4. Run STEP 3 to confirm the tables are empty.
--
-- These tables are linked by trade_no text, not foreign keys, so nothing cascades:
-- every table has to be cleared explicitly or you are left with orphan rows.


-- ============================================================
-- STEP 1 — pre-flight census. Save this output somewhere.
-- ============================================================
select 'orders'                          as table_name, count(*) as total_rows,
       count(*) filter (where paid)      as paid_rows          from public.orders
union all
select 'order_intakes', count(*),
       count(*) filter (where payment_status = 'paid')         from public.order_intakes
union all
select 'english_ai_reports', count(*), null::bigint            from public.english_ai_reports
union all
select 'report_price_experiment_events', count(*), null::bigint from public.report_price_experiment_events
union all
select 'user_records', count(*),
       count(*) filter (where trade_no is not null)            from public.user_records
union all
select 'memberships (NOT deleted below)', count(*), null::bigint from public.memberships;

-- Worth eyeballing before you commit: paid orders you are about to erase.
select trade_no, paid, created_at
from public.orders
where paid
order by created_at desc
limit 50;

-- Paid personal readings that were never delivered.
select order_reference, email, payment_status, status, created_at
from public.order_intakes
where payment_status = 'paid' and status <> 'delivered'
order by created_at desc
limit 50;


-- ============================================================
-- STEP 2 — the purge. Ends in ROLLBACK; change to COMMIT when ready.
-- ============================================================
begin;

-- One statement, so the editor returns every count in a single row. Separate
-- statements would each produce their own result set and the SQL editor only shows
-- you the last one.
with
  d_events  as (delete from public.report_price_experiment_events returning 1),
  d_reports as (delete from public.english_ai_reports returning 1),
  d_intakes as (delete from public.order_intakes returning 1),
  -- Saved readings that point at a paid order. Rows with trade_no IS NULL are free
  -- charts the user saved themselves, not order data, so they stay.
  d_records as (delete from public.user_records where trade_no is not null returning 1),
  d_orders  as (delete from public.orders returning 1)
select
  (select count(*) from d_events)  as report_price_experiment_events,
  (select count(*) from d_reports) as english_ai_reports,
  (select count(*) from d_intakes) as order_intakes,
  (select count(*) from d_records) as user_records,
  (select count(*) from d_orders)  as orders;

rollback;  -- <== change to COMMIT to actually delete


-- ============================================================
-- STEP 3 — verify (run after COMMIT)
-- ============================================================
-- select 'orders' as table_name, count(*) from public.orders
-- union all select 'order_intakes', count(*) from public.order_intakes
-- union all select 'english_ai_reports', count(*) from public.english_ai_reports
-- union all select 'report_price_experiment_events', count(*) from public.report_price_experiment_events
-- union all select 'user_records', count(*) from public.user_records;


-- ============================================================
-- DELIBERATELY NOT INCLUDED — uncomment only if you mean it
-- ============================================================
-- memberships: active PayPal subscriptions. Deleting the row does not cancel the
-- subscription at PayPal, so the subscriber keeps getting billed while losing all
-- access. Cancel the subscriptions in PayPal first, then delete.
--   delete from public.memberships;
--
-- newsletter_subscribers / *_deliveries: mailing list and send logs, not orders.
-- Deleting subscribers loses consent records for people who opted in.
--   delete from public.newsletter_deliveries;
--   delete from public.newsletter_subscribers;
--
-- daily_almanac_profiles / *_deliveries: almanac subscriptions and send history.
--   delete from public.daily_almanac_deliveries;
--   delete from public.free_daily_almanac_deliveries;
--   delete from public.monthly_bazi_deliveries;
--   delete from public.daily_almanac_profiles;
--
-- contact_submissions: inbound enquiries, some may be unanswered customers.
--   delete from public.contact_submissions;
--
-- api_abuse_logs: this is where site visits are recorded. Clearing it zeroes the
-- traffic numbers in data/growth_snapshot.json.
--   delete from public.api_abuse_logs;
