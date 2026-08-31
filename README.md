# Draw Desk

Lottery dashboard for Mega Millions, Powerball, Washington Hit 5, and Washington Lotto.

- Apple-style light UI
- Live official jackpots that auto-refresh (WA Lottery, Mega Millions, Powerball)
- Draw history, analyzer, predictor, winners archive, remaining combinations, import/export
- Saved tickets checked against the latest draw
- Sign-in: Google, X, or email. Tickets belong to the signed-in user and sync. Guest tickets stay local until sign-in, then merge.

## Run

Needs Node 22+.

```bash
npm install
npm run dev
```

Then open the printed local address. Create an account from **Sign in**.

Bundled draw history lives in `public/history/`. New draws merge from NY Open Data (Mega Millions, Powerball) and Washington Lottery (Hit 5, Lotto).

Signed-in tickets persist in Postgres (Neon when `DATABASE_URL` is set; embedded PGLite in local preview).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build + migrations |
| `npm run typecheck` | TypeScript check |
