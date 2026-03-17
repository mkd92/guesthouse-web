# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run check        # Svelte type check / lint

# Firebase deployment
npm run deploy               # Build + deploy everything
npm run deploy:hosting       # Frontend only
npm run deploy:functions     # Cloud Functions only
npm run deploy:rules         # Firestore rules & indexes only
```

Cloud Functions are in `functions/` and require Node.js 22. To deploy them separately: `firebase deploy --only functions`.

## Environment Setup

Copy `.env.example` to `.env` and fill in Firebase project credentials (all prefixed `VITE_FIREBASE_*`).

## Architecture

**Stack:** SvelteKit 2 (static adapter / SPA mode) + Firebase (Auth, Firestore, Cloud Functions, Hosting) + Tailwind CSS + PWA via vite-plugin-pwa.

### Key Directories

- `src/routes/` — File-based routing. Protected pages redirect to `/login` if unauthenticated.
- `src/lib/stores/auth.js` — Auth state (`user`, `userProfile`, `isAdmin`, `isLoggedIn`, `authLoading`). First registered user becomes admin automatically.
- `src/lib/stores/data.js` — All Firestore CRUD operations (rooms, beds, customers, bookings, transactions). Keep all data layer logic here.
- `src/lib/firebase.js` — Firebase SDK initialization (imported everywhere data/auth is needed).
- `src/lib/components/` — Shared UI: `Modal.svelte`, `Sidebar.svelte` (desktop), `BottomNav.svelte` (mobile), `TopBar.svelte`, `StatCard.svelte`.
- `functions/index.js` — 4 Cloud Functions: scheduled monthly rent generation, auth trigger for profile creation, and Firestore triggers to sync bed occupancy state on booking create/checkout.

### Data Model

Core Firestore collections: `users`, `rooms`, `beds`, `customers`, `bookings`, `transactions`.

- **Beds** belong to Rooms; occupancy tracked via `status` field (`available`/`occupied`).
- **Bookings** link a Customer to a Bed; creating/checking-out a booking triggers Cloud Functions that update the bed's status.
- **Transactions** track rent payments (`pending`/`paid`); a Cloud Function auto-generates pending transactions on the 1st of each month at 09:00 IST.

### Role-Based Access

- Roles: `admin` and `staff`. Admin-only routes: `/staff`.
- Firestore rules enforce admin-only writes to `users` and `meta` collections; role field is protected from self-modification.
- `isAdmin` store is derived from `userProfile.role`.

### Responsive Layout

- Desktop: persistent `Sidebar.svelte`
- Mobile: `BottomNav.svelte` + `TopBar.svelte`
- Tailwind custom utilities include safe-area insets for notch support (`safe-area-inset-*`).
- Custom Tailwind classes: `.btn-primary`, `.card`, `.input`, `.badge-*` defined in `app.css`.

### Composite Firestore Indexes

Defined in `firestore.indexes.json`. Required for queries filtering/sorting on multiple fields (e.g., beds by room + status, transactions by customer + status). Add new indexes here when adding multi-field queries.
