import unittest

from goldbot import sizing
from goldbot.broker.paper import DEFAULT_SPECS
from goldbot.config import BotConfig


class SizingTests(unittest.TestCase):
    def test_xauusd(self):
        self.assertAlmostEqual(sizing.lots_for_risk(1_000, 10.0, DEFAULT_SPECS["XAUUSD"]), 1.0)

    def test_cross_uses_tick_value(self):
        # XAUAUD: $0.66 per tick -> $66 per 1.0 move per lot. $1,000 / ($66 * 10) = 1.515 -> 1.51
        self.assertAlmostEqual(sizing.lots_for_risk(1_000, 10.0, DEFAULT_SPECS["XAUAUD"]), 1.51)

    def test_rounds_down_and_refuses_below_min(self):
        self.assertEqual(sizing.lots_for_risk(5, 10.0, DEFAULT_SPECS["XAUUSD"]), 0.0)

    def test_commission_counts_toward_risk(self):
        self.assertAlmostEqual(sizing.lots_for_risk(1_000, 10.0, DEFAULT_SPECS["XAUUSD"], 7.0), 0.99)

    def test_margin_cap(self):
        self.assertAlmostEqual(sizing.lots_for_margin(DEFAULT_SPECS["XAUUSD"], 2400.0, 10, 100_000, 0.5), 2.08)


class ConfigTests(unittest.TestCase):
    def test_defaults_valid_for_both_programs(self):
        BotConfig().validate()
        BotConfig().with_overrides({"program": "goat"}).validate()

    def test_rejects_breaker_above_firm_limit(self):
        with self.assertRaises(ValueError):
            BotConfig().with_overrides({"program": "goat", "eval_daily_breaker_pct": 4.5}).validate()

    def test_time_override(self):
        self.assertEqual(str(BotConfig().with_overrides({"force_flat_time": "16:40"}).force_flat_time), "16:40:00")


if __name__ == "__main__":
    unittest.main()
