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
3. Tables are created **automatically** on first API use (`CREATE TABLE IF NOT EXISTS`).  
   [`scripts/schema.sql`](scripts/schema.sql) is optional (manual / reference only).

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

After you unlock with your PIN, the app **automatically** reads localStorage and uploads to Neon when cloud slots are empty:

- `lankawealth_portfolio`
- `lankawealth_portfolio_snapshots`
- `lankawealth_scenarios`

You’ll see a short “Migrating local data to cloud…” screen, then a toast if anything was uploaded. Migrated local keys are then cleared.

**Export** on My Portfolio still downloads a JSON backup. **Import** remains available if you need to restore/replace from a file (check “Replace cloud data on import” to overwrite).

To force another local→cloud attempt, clear `lankawealth_migrated_to_neon` from DevTools → Application → Local Storage.

## Scripts

```bash
npm run dev
npm run build
npm start
npm run lint
```
