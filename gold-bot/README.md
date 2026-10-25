# Gold Bot: Guardian & Bimodal Risk Engine

Component 1 of the multi-agent gold system (XAUUSD, XAUEUR, XAUGBP, XAUAUD) for a Goat Funded
Trader 2-Step account. This part decides **whether** a trade may happen and **how big** it is.
The alpha agents (Asian sweep, NY breakout, cross-gold strength) come next. They only propose
`TradeSignal`s, and everything goes through `Engine.submit()`.

```
alpha agents ──TradeSignal──▶ Engine.submit()
                                 ├─ Guardian.entry_vetoes()   (Agent 1: rules, clock, news)
                                 ├─ RiskEngine.plan()         (Agent 4: mode + risk %)
                                 ├─ cap_for_room()            (a full stop can't trip a brake)
                                 └─ sizing (tick value, 1:20 / 1:10 margin) ─▶ broker
Engine.tick() every 500 ms ──▶ Guardian.observe() ──▶ flatten on any brake
```

## What it enforces

| Rule | Firm limit | Bot brake |
|---|---|---|
| Daily loss vs the 5 PM NY reference | 5% (GOAT 4%) | 2.8% eval, 0.8% funded: flatten, no entries until next day |
| Overall loss | 10% static | Equity ≤ 91.5% of initial: flatten and stop permanently |
| Floating equity raising the 5 PM reference | — | Flat by 16:45 NY; no entries 16:15–17:05 |
| Red-folder news (USD/EUR/GBP/AUD) | profit cap | No entries from 10 min before to 10 min after; no entries if an event is ≤30 min away; flatten 12 min before. No fresh calendar = no entries. |
| Weekend gap | profit deducted | No entries after Fri 13:30 NY or before Sun 19:00 NY |
| Funded daily profit cap | 3% | Flatten at 2.8% day P&L |
| Funded metals leverage | 1:10 | Lots capped so margin ≤ 50% of free margin at the stage's leverage, double-checked with the broker |
| Profitable days | 3 × ≥0.5% | Tracked per phase and per payout cycle; days lock at +0.52% when hunting them |

Every trade's risk is also shrunk so a full stop-out still leaves 0.2% before the daily breaker
and the kill floor. Max 2 trades a day and 1 open position.

## Evaluation mode: paced to 45 days, never gives up

* Phase 1: 1.0% base risk, 0.65% while below the starting balance, 1.25% once +2% up.
* Phase 2: 0.75% base, 0.65% below the starting balance, 1.0% once +2% up.
* **Pacing.** Phase 1 is planned for 27 days and Phase 2 for whatever is left of 45 days from the
  eval start. More than 30% of target **behind** schedule (and not in drawdown) adds +0.25% risk,
  never past 1.25%. More than 30% **ahead** while in the house-money tier drops back to base.
* **Past day 45** the bot does **not** shut down. It keeps trading at standard risk with no
  catch-up boost, because doubling down to make a deadline is how evaluations blow up.
* **Target hit:** the bot flattens to lock it in. With 3 profitable days it stops (`eval_passed`)
  until you run `advance`. If it is short of profitable days it hunts them at 0.35% risk and
  locks each day at +0.52%.

## Funded mode: 14-day cycles, resumes after payout date

1. **Hunt.** 0.35% risk (0.25% if the balance is more than 1% under initial), A+ setups only,
   and each day locks at +0.52%.
2. **Hibernate.** Once the cycle has 3 qualifying days and at least +1.5%, the bot stays flat
   **until the cycle's 14-day payout date**.
3. **Next cycle.** On day 14 a new cycle starts and the bot **trades again, whether or not the
   payout was taken.** Untaken profit just stays in the account. A cycle above +2.5% drops to
   minimum risk.
4. **Monthly cap.** Closed profit in a calendar month is capped at **4%** (≈ two cycles of
   1.5–2.5%). Hitting it means flat until the 1st of next month.

MT5 withdrawals are detected automatically as payouts. `payout` records one by hand.

## Usage

Python 3.11+. MT5 trading needs the Windows terminal (`pip install -r requirements.txt`).

```bash
python -m goldbot init --program standard --phase phase1 --balance 100000
python -m goldbot --config config.example.json status --login 123 --password *** --server GFT-Server --server-utc-offset 2
python -m goldbot run  --login 123 --password *** --server GFT-Server --server-utc-offset 2
python -m goldbot advance --phase phase2 --balance 100000   # new credentials from the firm
python -m goldbot advance --phase funded --balance 100000
```

* `--server-utc-offset` matters: MT5 stamps deals in broker server time. If it is wrong, P&L
  lands on the wrong trading day.
* Start the bot while the account is flat. The daily reference is rebuilt as balance minus
  today's closed P&L, which is exact only if the account was flat at 5 PM NY.
* All thresholds live in `goldbot/config.py`. Override any of them in a JSON file
  (`config.example.json`), with clock times written as `"HH:MM"` New York time.

## Tests

```bash
python -m unittest discover -s tests -t .
```

The tests cover each brake, the risk tiers, pacing, post-45-day behaviour, target and profitable-day
handling, funded hibernation, resuming after a missed payout, the monthly cap, payout detection,
and tick-value sizing on the crosses.

## Before going live

Check the firm's current rulebook before every new account. Prop firms change limits, news
windows and leverage without much notice, and every number above is a config value. Run it on a
demo or trial account first.
