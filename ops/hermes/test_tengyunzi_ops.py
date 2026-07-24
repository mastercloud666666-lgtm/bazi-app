#!/usr/bin/env python3

import unittest
from decimal import Decimal

import tengyunzi_ops as ops


class PriceExperimentAggregationTests(unittest.TestCase):
    def test_deduplicates_funnel_and_ignores_verification_visitors(self):
        common = {
            "visitor_id": "visitor-1",
            "variant_id": "ai_999__manual_9900",
            "ai_price": "9.99",
            "manual_price": "99.00",
            "product": "ai_report",
            "trade_no": None,
            "revenue": "0",
        }
        rows = [
            {**common, "event_type": "exposure"},
            {**common, "event_type": "exposure"},
            {**common, "event_type": "checkout"},
            {**common, "event_type": "order_created", "trade_no": "ORDER-1"},
            {**common, "event_type": "paid", "trade_no": "ORDER-1", "revenue": "9.99"},
            {**common, "event_type": "paid", "trade_no": "ORDER-1", "revenue": "9.99"},
            {
                **common,
                "visitor_id": "verification-1",
                "event_type": "paid",
                "trade_no": "TEST-1",
                "revenue": "9.99",
            },
        ]

        summary = ops.aggregate_price_experiment(rows)
        bucket = next(
            row for row in summary["by_price"]
            if row["product"] == "ai_report" and row["price"] == Decimal("9.99")
        )

        self.assertEqual(bucket["exposures"], 1)
        self.assertEqual(bucket["checkouts"], 1)
        self.assertEqual(bucket["orders"], 1)
        self.assertEqual(bucket["paid"], 1)
        self.assertEqual(bucket["revenue"], Decimal("9.99"))

    def test_keeps_all_five_price_rows_when_no_events_exist(self):
        summary = ops.aggregate_price_experiment([])
        self.assertEqual(len(summary["by_price"]), 5)
        self.assertTrue(all(row["exposures"] == 0 for row in summary["by_price"]))


if __name__ == "__main__":
    unittest.main()
