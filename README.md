# LankaWealth — Investment Dashboard

Next.js app for tracking Sri Lankan passive-income investments (FD, Unit Trusts, Treasury, Dividends, PFCA).

## Stack

- Next.js 16 + React 19
- Neon Postgres (portfolio, snapshots, scenarios)
- PIN login (single-user)
- Rates still use localStorage / API scraping for market data

## Setup

### 1. Neon database

1. Create a project at [neon.tech](https://neon.tech)
2. Copy the connection string into `DATABASE_URL`
3. Run [`scripts/schema.sql`](scripts/schema.sql) in the Neon SQL Editor

### 2. Environment

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon connection string |
| `APP_PIN` | Login PIN |
| `SESSION_SECRET` | Cookie signing secret (long random string) |

Also set these in **Vercel → Project → Environment Variables** for production.

### 3. Install & run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and unlock with your PIN.

## Migrating existing browser data

Your old data lives in **this browser’s localStorage**. Neon does not see it until you import.

1. On My Portfolio, click **Export** — downloads a JSON backup (portfolio + snapshots; includes local scenarios if still present)
2. Or build the file yourself from DevTools → Application → Local Storage keys:
   - `lankawealth_portfolio`
   - `lankawealth_portfolio_snapshots`
   - `lankawealth_scenarios`
3. After PIN login on the Neon-backed app, click **Import** and choose the JSON
4. Leave **Replace cloud data on import** unchecked to only fill empty Neon slots; check it to overwrite

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
