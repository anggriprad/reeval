# Project: erp-reeval

## Architecture
- Framework: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide icons, Sonner toasts, `@hello-pangea/dnd`.
- Data & API Layer: In-memory REST API abstraction layer with TypeScript schemas and REST API route handlers under `src/app/api/` supporting CRUD for Products, Stock Movements, Sales Orders, Invoices, Production Logs, and Delivery Tracking.
- Module Navigation: Responsive Sidebar & Navbar connecting `/inventory`, `/sales`, `/sales-order`, `/order`, `/finance`, `/production`, `/delivery`, `/login`.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Data Model & API Abstraction Layer | TypeScript schemas, Data Provider abstraction (`src/lib/data-provider.ts`), REST API Route handlers under `src/app/api/` for Products, Stock Movements, Orders, Invoices, Production Logs, and Delivery Tracking | none | DONE |
| 2 | Auth & Layout Shell | `/login` screen, responsive Sidebar, Header Navbar, `/sales` and `/sales-order` dedicated landing/tab pages | M1 | DONE |
| 3 | Operational Modules & API Hooks | `/inventory`, `/production`, `/delivery` connected with API endpoints and real-time state synchronization | M1, M2 | DONE |
| 4 | Commercial & Financial Modules & API Hooks | `/sales`, `/sales-order`, `/order`, `/finance` connected with API endpoints and real-time state synchronization | M1, M2 | DONE |
| 5 | Full Integration & Build Verification | Integration tests, error boundary handling, UI component rules compliance, and clean `npm run build` verification | M1, M2, M3, M4 | DONE |

## Interface Contracts
### Data Provider Layer (`src/lib/data-provider.ts`) ↔ API Handler Routes (`src/app/api/`)
- API endpoints:
  - `/api/products` (GET, POST, PUT, DELETE)
  - `/api/inventory` (GET, POST stock movements / POs)
  - `/api/orders` (GET, POST, PUT status transitions)
  - `/api/production` (GET, POST work orders / job cards)
  - `/api/delivery` (GET, POST delivery orders / proof of delivery)
  - `/api/finance` (GET, POST invoices / payments / journal entries)

## Code Layout
- `src/app/api/` — API route handlers for CRUD operations
- `src/app/` — App Router page views (`/inventory`, `/sales`, `/sales-order`, `/order`, `/finance`, `/production`, `/delivery`, `/login`)
- `src/components/` — Shared UI layout, tables, modals, cards, badges
- `src/context/` — Central React state provider (`AppContext.tsx`)
- `src/lib/` — Data provider, types, accounting, initial-data, helpers

## Project UI & Development Rules
1. **Reusable Component Architecture**: Pastikan setiap pembuatan halaman baru menggunakan komponen reusable yang ada di `src/components/ui/`. Jika komponen yang dibutuhkan belum ada dan berpotensi digunakan berulang (default UI component), buat komponen baru yang reusable di `src/components/ui/` agar dapat digunakan di halaman lain.
2. **Standardized Modal Actions**: Penggunaan Modal (`Modal.tsx`): Jika modal memiliki action button (seperti Simpan, Batal, Hapus, dll), selalu gunakan prop `actions`. Jangan pernah menyimpan action button di dalam `children`.
3. **Dual Theme Color Coverage**: Penggunaan warna: Selalu terapkan class styling warna untuk kedua tema secara konsisten: Dark Mode (`dark:...`) dan Light Mode.
4. **Design System & Aesthetics Guidance**: Selalu ikuti `/frontend-design` (`.agents/skills/frontend-design/SKILL.md`) sebagai panduan utama desain UI, tipografi, serta estetika visual.
