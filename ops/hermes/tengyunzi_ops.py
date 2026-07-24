#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Tengyunzi business digest and paid-order alerts for the Hermes VPS."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import sys
import time
from collections import Counter, defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

import requests

SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))
import feishu_send  # noqa: E402

ENV_FILE = Path(os.environ.get("HERMES_ENV_FILE", "/root/.hermes/.env"))
STATE_FILE = Path(os.environ.get("TENGYUNZI_ORDER_STATE", "/root/.hermes/order_notify_state.json"))
TIMEZONE = ZoneInfo(os.environ.get("TENGYUNZI_TIMEZONE", "Asia/Taipei"))
DEFAULT_CHAT_ID = "oc_fb8e03c448a17214c300c805ce23b93a"

TEST_PREFIXES = (
    "bazi-health",
    "bazi-test",
    "bazi-probe",
    "bazi-stock",
    "bazi-codextest",
    "bazi-wxprobe",
    "bazi-manual",
    "bazi-copy-agent-test",
)

USD_PRICES = {
    "english_report": Decimal("9.99"),
    "personal_reading": Decimal("99.00"),
    "monthly": Decimal("9.90"),
    "yearly": Decimal("69.00"),
    "daily_almanac": Decimal("9.90"),
    "monthly_bazi": Decimal("9.90"),
}

EXPERIMENT_AI_PRICES = (Decimal("9.99"), Decimal("19.99"), Decimal("49.00"))
EXPERIMENT_MANUAL_PRICES = (Decimal("99.00"), Decimal("149.00"))
EXPERIMENT_PRODUCT_LABELS = {
    "ai_report": "AI 报告",
    "personal_reading": "人工报告",
}

CNY_PRICES = {
    "basic": Decimal("19"),
    "pro": Decimal("49"),
    "vip": Decimal("99"),
    "pdf": Decimal("19"),
    "consult": Decimal("499"),
    "copy_agent_100": Decimal("10"),
    "zhanbu": Decimal("69"),
    "hepan": Decimal("199"),
}

PRODUCT_LABELS = {
    "english_report": "24-Part AI BaZi Report",
    "personal_reading": "Personal Reading by Tengyunzi",
    "monthly": "Monthly BaZi Forecast Membership",
    "yearly": "Yearly BaZi Forecast Membership",
    "daily_almanac": "Monthly BaZi Forecast Membership",
    "monthly_bazi": "Monthly BaZi Forecast Membership",
    "basic": "BaZi Starter Report",
    "pro": "BaZi Advanced Report",
    "vip": "BaZi Premium Report",
    "pdf": "BaZi PDF",
    "consult": "1-to-1 Consultation",
    "copy_agent_100": "Copy Agent Credits",
    "zhanbu": "I Ching Reading",
    "hepan": "Compatibility Reading",
}


def load_env() -> dict[str, str]:
    values: dict[str, str] = {}
    if ENV_FILE.exists():
        for raw in ENV_FILE.read_text(encoding="utf-8").splitlines():
            line = raw.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip('"').strip("'")
    values.update({k: v for k, v in os.environ.items() if v})
    return values


ENV = load_env()


def require_env(name: str) -> str:
    value = ENV.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


class SupabaseRest:
    def __init__(self) -> None:
        self.base = require_env("SUPABASE_URL").rstrip("/") + "/rest/v1"
        self.key = require_env("SUPABASE_SERVICE_ROLE_KEY")
        self.headers = {
            "apikey": self.key,
            "Authorization": f"Bearer {self.key}",
        }

    def query_all(self, table: str, params: dict[str, str], page_size: int = 1000) -> list[dict[str, Any]]:
        rows: list[dict[str, Any]] = []
        offset = 0
        while True:
            query = dict(params)
            query["limit"] = str(page_size)
            query["offset"] = str(offset)
            response = requests.get(
                f"{self.base}/{table}",
                params=query,
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()
            page = response.json()
            if not isinstance(page, list):
                raise RuntimeError(f"Unexpected Supabase response for {table}")
            rows.extend(page)
            if len(page) < page_size:
                return rows
            offset += page_size

    def count(self, table: str, params: dict[str, str]) -> int:
        query = dict(params)
        query.setdefault("select", "id")
        headers = dict(self.headers)
        headers.update({"Prefer": "count=exact", "Range": "0-0"})
        response = requests.get(
            f"{self.base}/{table}",
            params=query,
            headers=headers,
            timeout=30,
        )
        response.raise_for_status()
        content_range = response.headers.get("Content-Range", "")
        if "/" not in content_range:
            raise RuntimeError(f"Missing exact count for {table}")
        total = content_range.rsplit("/", 1)[1]
        return 0 if total == "*" else int(total)


def safe_json(value: Any) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if not isinstance(value, str) or not value.strip():
        return {}
    try:
        parsed = json.loads(value)
        return parsed if isinstance(parsed, dict) else {}
    except (TypeError, ValueError, json.JSONDecodeError):
        return {}


def nested_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def as_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    try:
        amount = Decimal(str(value).strip())
        return amount if amount >= 0 else None
    except (InvalidOperation, ValueError):
        return None


def order_details(row: dict[str, Any]) -> dict[str, Any] | None:
    trade_no = str(row.get("trade_no") or "").strip()
    birth = safe_json(row.get("birth_input"))
    if not trade_no or any(trade_no.startswith(prefix) for prefix in TEST_PREFIXES):
        return None
    if birth.get("admin_test") or birth.get("healthcheck"):
        return None

    option = nested_dict(birth.get("payment_option"))
    membership = nested_dict(birth.get("membership"))
    tracking = nested_dict(birth.get("tracking"))
    gateway = nested_dict(tracking.get("gateway"))
    payment = nested_dict(birth.get("payment"))

    option_id = str(
        option.get("id")
        or birth.get("payment_option_id")
        or membership.get("plan")
        or birth.get("plan")
        or birth.get("order_service")
        or "unknown"
    ).strip().lower()

    explicit_currency = str(
        birth.get("currency")
        or payment.get("currency")
        or gateway.get("currency")
        or ""
    ).strip().upper()
    product_family = str(birth.get("product_family") or "").lower()
    is_usd = option_id in USD_PRICES or "tengyunzi" in product_family or "english" in product_family
    currency = explicit_currency or ("USD" if is_usd else "CNY")

    amount_candidates = (
        birth.get("payment_amount"),
        payment.get("amount"),
        gateway.get("gateway_total_fee"),
        option.get("fee"),
        option.get("amount"),
    )
    amount = next((candidate for candidate in (as_decimal(v) for v in amount_candidates) if candidate is not None), None)
    if amount is None:
        amount = USD_PRICES.get(option_id) if currency == "USD" else CNY_PRICES.get(option_id)

    email = str(birth.get("email") or membership.get("email") or "").strip().lower()
    paid_at = str(row.get("paid_at") or row.get("created_at") or "")
    product = PRODUCT_LABELS.get(option_id) or str(birth.get("product") or option.get("title") or option_id)
    return {
        "trade_no": trade_no,
        "option_id": option_id,
        "product": product,
        "amount": amount,
        "currency": currency,
        "email": email,
        "paid_at": paid_at,
    }


def is_bot(meta: Any) -> bool:
    data = safe_json(meta) if isinstance(meta, str) else nested_dict(meta)
    user_agent = str(data.get("user_agent") or data.get("ua") or "").lower()
    return any(token in user_agent for token in (
        "bot", "spider", "crawl", "slurp", "bingpreview", "headless", "lighthouse", "pagespeed"
    ))


def local_day_window(now: dt.datetime | None = None) -> tuple[dt.datetime, dt.datetime, dt.datetime]:
    current = (now or dt.datetime.now(dt.timezone.utc)).astimezone(TIMEZONE)
    start_local = current.replace(hour=0, minute=0, second=0, microsecond=0)
    return current, start_local, start_local.astimezone(dt.timezone.utc)


def iso_utc(value: dt.datetime) -> str:
    return value.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z")


def money_text(currency: str, amount: Decimal) -> str:
    if currency == "USD":
        return f"US${amount.quantize(Decimal('0.01'))}"
    if currency == "CNY":
        return f"CNY ¥{amount.quantize(Decimal('0.01'))}"
    return f"{currency} {amount.quantize(Decimal('0.01'))}"


def mask_email(email: str) -> str:
    if "@" not in email:
        return "未提供"
    local, domain = email.split("@", 1)
    visible = local[:2] if len(local) > 2 else local[:1]
    return f"{visible}***@{domain}"


def parse_time(value: str) -> str:
    if not value:
        return dt.datetime.now(TIMEZONE).strftime("%Y-%m-%d %H:%M:%S")
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        return parsed.astimezone(TIMEZONE).strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return value


def paid_orders_since(client: SupabaseRest, start_utc: dt.datetime) -> list[dict[str, Any]]:
    rows = client.query_all("orders", {
        "select": "trade_no,birth_input,paid_at,created_at",
        "paid": "eq.true",
        "paid_at": f"gte.{iso_utc(start_utc)}",
        "order": "paid_at.asc",
    })
    details = [order_details(row) for row in rows]
    return [item for item in details if item is not None]


def price_experiment_events_since(client: SupabaseRest, start_utc: dt.datetime) -> list[dict[str, Any]]:
    return client.query_all("report_price_experiment_events", {
        "select": "visitor_id,variant_id,ai_price,manual_price,event_type,product,trade_no,revenue,created_at",
        "experiment_key": "eq.report_pricing_v1",
        "created_at": f"gte.{iso_utc(start_utc)}",
        "order": "created_at.asc",
    })


def event_time(value: Any) -> dt.datetime | None:
    try:
        parsed = dt.datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
        return parsed.astimezone(dt.timezone.utc)
    except (TypeError, ValueError):
        return None


def empty_experiment_bucket(product: str, price: Decimal) -> dict[str, Any]:
    return {
        "product": product,
        "price": price,
        "exposures": set(),
        "checkouts": set(),
        "orders": set(),
        "paid": set(),
        "revenue": Decimal("0"),
    }


def aggregate_price_experiment(rows: list[dict[str, Any]]) -> dict[str, Any]:
    by_price: dict[tuple[str, Decimal], dict[str, Any]] = {}
    by_variant: dict[str, dict[str, Any]] = {}

    for product, prices in (
        ("ai_report", EXPERIMENT_AI_PRICES),
        ("personal_reading", EXPERIMENT_MANUAL_PRICES),
    ):
        for price in prices:
            by_price[(product, price)] = empty_experiment_bucket(product, price)

    for row in rows:
        visitor_id = str(row.get("visitor_id") or "").strip().lower()
        variant_id = str(row.get("variant_id") or "").strip()
        product = str(row.get("product") or "").strip().lower()
        event_type = str(row.get("event_type") or "").strip().lower()
        trade_no = str(row.get("trade_no") or "").strip()
        ai_price = as_decimal(row.get("ai_price")) or Decimal("0")
        manual_price = as_decimal(row.get("manual_price")) or Decimal("0")
        price = ai_price if product == "ai_report" else manual_price
        identity = trade_no or visitor_id
        if (
            not visitor_id
            or visitor_id.startswith("verification-")
            or not variant_id
            or product not in EXPERIMENT_PRODUCT_LABELS
            or event_type not in {"exposure", "checkout", "order_created", "paid"}
            or price <= 0
        ):
            continue

        bucket = by_price.setdefault((product, price), empty_experiment_bucket(product, price))
        if event_type == "exposure":
            bucket["exposures"].add(visitor_id)
        elif event_type == "checkout":
            bucket["checkouts"].add(visitor_id)
        elif event_type == "order_created" and identity:
            bucket["orders"].add(identity)
        elif event_type == "paid" and identity and identity not in bucket["paid"]:
            bucket["paid"].add(identity)
            bucket["revenue"] += as_decimal(row.get("revenue")) or Decimal("0")

        cell = by_variant.setdefault(variant_id, {
            "variant_id": variant_id,
            "ai_price": ai_price,
            "manual_price": manual_price,
            "exposures": set(),
            "orders": set(),
            "paid": set(),
            "revenue": Decimal("0"),
        })
        if event_type == "exposure":
            cell["exposures"].add(visitor_id)
        elif event_type == "order_created" and identity:
            cell["orders"].add(identity)
        elif event_type == "paid" and identity and identity not in cell["paid"]:
            cell["paid"].add(identity)
            cell["revenue"] += as_decimal(row.get("revenue")) or Decimal("0")

    price_rows = []
    for bucket in by_price.values():
        exposures = len(bucket["exposures"])
        paid = len(bucket["paid"])
        revenue = bucket["revenue"]
        price_rows.append({
            "product": bucket["product"],
            "price": bucket["price"],
            "exposures": exposures,
            "checkouts": len(bucket["checkouts"]),
            "orders": len(bucket["orders"]),
            "paid": paid,
            "conversion": Decimal(paid) / Decimal(exposures) if exposures else Decimal("0"),
            "revenue": revenue,
            "revenue_per_exposure": revenue / Decimal(exposures) if exposures else Decimal("0"),
        })
    price_rows.sort(key=lambda item: (item["product"], item["price"]))

    variant_rows = []
    for cell in by_variant.values():
        variant_rows.append({
            "variant_id": cell["variant_id"],
            "ai_price": cell["ai_price"],
            "manual_price": cell["manual_price"],
            "exposures": len(cell["exposures"]),
            "orders": len(cell["orders"]),
            "paid": len(cell["paid"]),
            "revenue": cell["revenue"],
        })
    variant_rows.sort(key=lambda item: (item["ai_price"], item["manual_price"]))
    return {"by_price": price_rows, "by_variant": variant_rows}


def experiment_digest_lines(today_rows: list[dict[str, Any]], rolling_rows: list[dict[str, Any]]) -> list[str]:
    today = aggregate_price_experiment(today_rows)
    rolling = aggregate_price_experiment(rolling_rows)
    today_prices = today["by_price"]
    today_revenue = sum((row["revenue"] for row in today_prices), Decimal("0"))
    lines = [
        "价格实验",
        (
            f"• 今日漏斗：曝光 {sum(row['exposures'] for row in today_prices):,}｜"
            f"结账 {sum(row['checkouts'] for row in today_prices):,}｜"
            f"下单 {sum(row['orders'] for row in today_prices):,}｜"
            f"付款 {sum(row['paid'] for row in today_prices):,}｜"
            f"收入 US${today_revenue.quantize(Decimal('0.01'))}"
        ),
        "• 近30天分价格：",
    ]
    for row in rolling["by_price"]:
        label = EXPERIMENT_PRODUCT_LABELS[row["product"]]
        lines.append(
            f"  {label} US${row['price'].quantize(Decimal('0.01'))}："
            f"曝光 {row['exposures']:,}｜结账 {row['checkouts']:,}｜付款 {row['paid']:,}｜"
            f"转化 {(row['conversion'] * 100).quantize(Decimal('0.01'))}%｜"
            f"收入 US${row['revenue'].quantize(Decimal('0.01'))}｜"
            f"单曝光 US${row['revenue_per_exposure'].quantize(Decimal('0.01'))}"
        )

    cell_map = {
        (row["ai_price"], row["manual_price"]): row
        for row in rolling["by_variant"]
    }
    lines.append("• 六组组合（近30天）：")
    for manual_price in EXPERIMENT_MANUAL_PRICES:
        for ai_price in EXPERIMENT_AI_PRICES:
            row = cell_map.get((ai_price, manual_price), {
                "exposures": 0,
                "orders": 0,
                "paid": 0,
                "revenue": Decimal("0"),
            })
            lines.append(
                f"  AI {ai_price} + 人工 {manual_price}："
                f"曝光 {row['exposures']:,}｜下单 {row['orders']:,}｜付款 {row['paid']:,}｜"
                f"收入 US${row['revenue'].quantize(Decimal('0.01'))}"
            )

    minimum_exposure = min((row["exposures"] for row in rolling["by_price"]), default=0)
    sample_state = "达到初步样本线" if minimum_exposure >= 100 else "继续收集，不判定赢家"
    lines.append(f"• 样本进度：最低 {minimum_exposure:,}/100，{sample_state}")
    return lines


def build_digest(client: SupabaseRest) -> str:
    now_local, start_local, start_utc = local_day_window()
    start_iso = iso_utc(start_utc)
    now_iso = iso_utc(now_local)

    visits = client.query_all("api_abuse_logs", {
        "select": "identifier,meta,created_at",
        "scope": "eq.site_visit",
        "event": "eq.page_view",
        "created_at": f"gte.{start_iso}",
        "order": "created_at.asc",
    })
    human_visits = [visit for visit in visits if not is_bot(visit.get("meta"))]
    unique_visitors = len({str(v.get("identifier")) for v in human_visits if v.get("identifier")})

    orders = paid_orders_since(client, start_utc)
    revenue: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    products: Counter[str] = Counter()
    for order in orders:
        if order["amount"] is not None:
            revenue[order["currency"]] += order["amount"]
        products[order["product"]] += 1

    subscriber_filters = {"status": "eq.subscribed"}
    newsletter_total = client.count("newsletter_subscribers", subscriber_filters)
    newsletter_new = client.count("newsletter_subscribers", {
        **subscriber_filters,
        "subscribed_at": f"gte.{start_iso}",
    })
    free_daily_total = client.count("newsletter_subscribers", {
        **subscriber_filters,
        "free_daily_enabled": "eq.true",
    })
    active_members = client.count("memberships", {
        "select": "user_id",
        "status": "eq.active",
        "expires_at": f"gt.{now_iso}",
    })
    new_members = client.count("memberships", {
        "select": "user_id",
        "status": "eq.active",
        "expires_at": f"gt.{now_iso}",
        "created_at": f"gte.{start_iso}",
    })

    rolling_start_utc = start_utc - dt.timedelta(days=29)
    rolling_experiment_events = price_experiment_events_since(client, rolling_start_utc)
    today_experiment_events = [
        row for row in rolling_experiment_events
        if (event_time(row.get("created_at")) or dt.datetime.min.replace(tzinfo=dt.timezone.utc)) >= start_utc
    ]
    price_experiment_lines = experiment_digest_lines(today_experiment_events, rolling_experiment_events)

    revenue_line = " / ".join(money_text(code, amount) for code, amount in sorted(revenue.items())) or "US$0.00"
    product_line = "；".join(f"{name} × {count}" for name, count in products.most_common()) or "暂无成交"
    end_text = now_local.strftime("%H:%M")

    return "\n".join([
        f"【滕云子经营日报】{now_local:%Y-%m-%d}",
        f"统计区间：00:00–{end_text}（Asia/Taipei）",
        "",
        "流量",
        f"• 页面访问：{len(visits):,}",
        f"• 有效访问：{len(human_visits):,}",
        f"• 独立访客：{unique_visitors:,}",
        f"• 过滤机器人：{len(visits) - len(human_visits):,}",
        "",
        "成交",
        f"• 付费订单：{len(orders):,}",
        f"• 实收金额：{revenue_line}",
        f"• 订单构成：{product_line}",
        "",
        "订阅",
        f"• Newsletter：{newsletter_total:,}（今日 +{newsletter_new:,}）",
        f"• 免费每日黄历：{free_daily_total:,}",
        f"• 有效付费会员：{active_members:,}（今日 +{new_members:,}）",
        "",
        *price_experiment_lines,
    ])


def feishu_chat_id() -> str:
    return ENV.get("FEISHU_CHAT_ID", "").strip() or DEFAULT_CHAT_ID


def send_message(message: str) -> None:
    token = feishu_send.token()
    result = feishu_send.send_text(token, feishu_chat_id(), message)
    if not isinstance(result, dict) or result.get("code") not in (None, 0):
        raise RuntimeError(f"Feishu send failed: {json.dumps(result, ensure_ascii=False)}")


def load_state() -> dict[str, Any]:
    if not STATE_FILE.exists():
        return {"initialized": False, "notified": {}}
    try:
        state = json.loads(STATE_FILE.read_text(encoding="utf-8"))
        return state if isinstance(state, dict) else {"initialized": False, "notified": {}}
    except (OSError, ValueError, json.JSONDecodeError):
        return {"initialized": False, "notified": {}}


def save_state(state: dict[str, Any]) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp = STATE_FILE.with_suffix(".tmp")
    temp.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    os.chmod(temp, 0o600)
    temp.replace(STATE_FILE)


def order_alert(client: SupabaseRest, order: dict[str, Any], test: bool = False) -> str:
    now_local, _, start_utc = local_day_window()
    today = paid_orders_since(client, start_utc)
    today_revenue: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for item in today:
        if item["amount"] is not None:
            today_revenue[item["currency"]] += item["amount"]
    totals = " / ".join(money_text(code, amount) for code, amount in sorted(today_revenue.items())) or "US$0.00"
    amount = money_text(order["currency"], order["amount"]) if order["amount"] is not None else "金额待核对"
    title = "【付费订单提醒测试】" if test else "【新付费订单】"
    return "\n".join([
        title,
        f"到账金额：{amount}",
        f"产品：{order['product']}",
        f"订单号：{order['trade_no']}",
        f"客户：{mask_email(order['email'])}",
        f"到账时间：{parse_time(order['paid_at'])}",
        "",
        f"今日累计：{len(today)} 单 / {totals}",
        f"监控状态：Hermes VPS 正常（{now_local:%H:%M:%S}）",
    ])


def watcher_once(client: SupabaseRest) -> int:
    state = load_state()
    lookback = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=90)
    orders = paid_orders_since(client, lookback)
    notified = state.get("notified") if isinstance(state.get("notified"), dict) else {}

    if not state.get("initialized"):
        for order in orders:
            notified[order["trade_no"]] = order["paid_at"]
        state.update({
            "initialized": True,
            "initialized_at": dt.datetime.now(dt.timezone.utc).isoformat(),
            "notified": notified,
        })
        save_state(state)
        print(f"Initialized watcher with {len(notified)} existing paid orders; no historical alerts sent.", flush=True)
        return 0

    sent = 0
    for order in orders:
        if order["trade_no"] in notified:
            continue
        send_message(order_alert(client, order))
        notified[order["trade_no"]] = order["paid_at"]
        state["last_alert_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
        save_state(state)
        sent += 1
        print(f"Sent paid-order alert for {order['trade_no']}", flush=True)

    if len(notified) > 5000:
        notified = dict(sorted(notified.items(), key=lambda item: item[1])[-5000:])
    state["notified"] = notified
    state["last_poll_at"] = dt.datetime.now(dt.timezone.utc).isoformat()
    save_state(state)
    return sent


def watcher_loop(client: SupabaseRest, poll_seconds: int) -> None:
    failures = 0
    while True:
        try:
            watcher_once(client)
            failures = 0
        except Exception as exc:  # Keep the systemd service alive through transient API errors.
            failures += 1
            print(f"Watcher error ({failures}): {exc}", file=sys.stderr, flush=True)
        time.sleep(min(max(poll_seconds, 5) * max(failures, 1), 300))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    digest = sub.add_parser("digest", help="Build the current-day operating digest")
    digest.add_argument("--send", action="store_true", help="Send the digest to Feishu")

    watch = sub.add_parser("watch", help="Watch for newly paid orders")
    watch.add_argument("--once", action="store_true", help="Run one poll and exit")
    watch.add_argument("--poll-seconds", type=int, default=10)

    sub.add_parser("test-alert", help="Send a clearly labelled test paid-order alert")
    sub.add_parser("check", help="Validate Supabase and Feishu configuration")
    args = parser.parse_args()
    client = SupabaseRest()

    if args.command == "digest":
        message = build_digest(client)
        print(message)
        if args.send:
            send_message(message)
        return 0

    if args.command == "watch":
        if args.once:
            watcher_once(client)
        else:
            watcher_loop(client, args.poll_seconds)
        return 0

    if args.command == "test-alert":
        fake = {
            "trade_no": "SYSTEM-TEST-NOT-A-REAL-ORDER",
            "product": "24-Part AI BaZi Report",
            "amount": Decimal("9.99"),
            "currency": "USD",
            "email": "test@tengyunzi.com",
            "paid_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        }
        message = order_alert(client, fake, test=True)
        print(message)
        send_message(message)
        return 0

    if args.command == "check":
        client.count("newsletter_subscribers", {"status": "eq.subscribed"})
        token = feishu_send.token()
        if not token:
            raise RuntimeError("Feishu token was empty")
        print("Supabase and Feishu configuration are valid.")
        return 0

    return 2


if __name__ == "__main__":
    raise SystemExit(main())
