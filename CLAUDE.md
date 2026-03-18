# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Svelte type check / lint

# Deployment
vercel --prod        # Deploy to Vercel
```

## Environment Setup

Copy `.env.example` to `.env` and fill in Supabase credentials:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Architecture

**Stack:** SvelteKit 2 (static adapter / SPA mode) + Supabase (Auth, Postgres DB) + Vercel (Hosting) + Tailwind CSS + PWA via vite-plugin-pwa.

### Key Directories

- `src/routes/` — File-based routing. Protected pages redirect to `/login` if unauthenticated.
- `src/lib/supabase.js` — Supabase client initialization.
- `src/lib/stores/auth.js` — Auth state (`user`, `userProfile`, `isAdmin`, `isLoggedIn`, `authLoading`). First registered user becomes admin automatically.
- `src/lib/stores/data.js` — All Supabase CRUD operations (rooms, beds, customers, bookings, transactions, leases, expenses, maintenance, accounts). Keep all data layer logic here.
- `src/lib/components/` — Shared UI: `Modal.svelte`, `Sidebar.svelte` (desktop), `BottomNav.svelte` (mobile), `TopBar.svelte`, `StatCard.svelte`.

### Data Model

Core Supabase tables: `users`, `properties`, `rooms`, `beds`, `customers`, `bookings`, `units`, `leases`, `transactions`, `expenses`, `maintenance`, `accounts`, `account_transfers`.

- **Beds** belong to Rooms; occupancy tracked via `status` field (`available`/`occupied`).
- **Bookings** link a Customer to a Bed; DB triggers sync bed status on booking create/checkout.
- **Transactions** track rent payments (`pending`/`paid`); a `pg_cron` job auto-generates pending transactions on the 1st of each month at 09:00 IST.
- **Leases** are for residential units (separate from PG bed bookings).

### Role-Based Access

- Roles: `admin` and `staff`. Admin-only routes: `/staff`.
- Supabase RLS policies enforce access control; role field is protected from self-modification.
- `isAdmin` store is derived from `userProfile.role`.

### Responsive Layout

- Desktop: persistent `Sidebar.svelte`
- Mobile: `BottomNav.svelte` + `TopBar.svelte`
- Tailwind custom utilities include safe-area insets for notch support (`safe-area-inset-*`).
- Custom Tailwind classes: `.btn-primary`, `.card`, `.input`, `.badge-*` defined in `app.css`.

### Database Setup

Schema and functions are in `supabase-schema.sql` and `supabase-functions.sql`. Run these in the Supabase SQL Editor. Enable the `pg_cron` extension for scheduled monthly rent generation.
