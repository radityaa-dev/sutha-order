# Sutha Corner - QR Table Order System

Mobile-first food ordering system for canteens. Customers scan QR codes at tables to order and pay. Admin manages menu, tables, and orders via dashboard.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Database**: Supabase (PostgreSQL) with RLS
- **Payment**: Midtrans Snap (sandbox)
- **Deploy**: Vercel

## Setup

### 1. Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in the values:
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-only)
- `MIDTRANS_SERVER_KEY`: Midtrans sandbox server key
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY`: Midtrans sandbox client key
- `NEXT_PUBLIC_APP_URL`: App URL (default `http://localhost:3000`)

### 2. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Get your project URL and API keys from project settings
3. Note the service role key (kept secret, server-only)

### 3. Run Migration & Seed

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Create new query and run `supabase/migrations/001_init.sql`
3. Create another query and run `supabase/seed.sql`

Or use Supabase CLI:

```bash
npx supabase link --project-ref <project-id>
npx supabase db push
npx supabase db seed
```

### 4. Xendit Setup

1. Sign up at [xendit.co](https://xendit.co)
2. Get your Secret Key and Public Key from dashboard
3. Add to `.env.local`

### 5. Install & Run

```bash
npm install
npm run dev
```

Visit `http://localhost:3000`

## Database Schema

- **categories**: Menu categories (makanan, minuman, snack)
- **menus**: Menu items with price, description, image
- **tables**: Physical tables with QR tokens
- **orders**: Customer orders with status tracking
- **order_items**: Line items in orders
- **payments**: Payment records from Midtrans

All tables use Row Level Security (RLS) for data isolation.

## Project Structure

```
app/              # Next.js pages & routes
components/       # React components
components/ui/    # shadcn/ui components
lib/
  supabase/       # Supabase clients & helpers
  types.ts        # TypeScript types
  utils.ts        # Utilities
public/           # Static assets
supabase/
  migrations/     # SQL migrations
  seed.sql        # Initial data
```

## Admin Setup

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter admin email and password
4. Confirm email (if email confirmation enabled)
5. Login at `/admin/login`

## Notes

- Prices always recalculated server-side from database (never trust client)
- Secret keys (service role, server key) never sent to client
- All URLs use `NEXT_PUBLIC_APP_URL` base
- Input validated with zod
- Mobile-first responsive design
