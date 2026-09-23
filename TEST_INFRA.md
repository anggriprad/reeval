# Reeval ERP — E2E Testing Infrastructure (`TEST_INFRA.md`)

## 1. Overview & Test Architecture

The E2E testing framework for **Reeval ERP** provides opaque-box, behavior-based, and scenario-driven verification across all core enterprise modules:
- **Auth & Access Control (RBAC)**
- **Inventory & Material Management**
- **Sales & Commercial Order Processing**
- **Factory Production & SPK Work Orders**
- **Logistics & Delivery Operations (Surat Jalan)**
- **Finance, Invoicing & Double-Entry Accounting**

The framework is implemented as an automated runner in `scripts/run-e2e-tests.ts`. It executes without hardcoded test mocks, performing real business logic state mutations, boundary checks, cross-module workflow tracking, and financial ledger balance verification (Sum Debit = Sum Credit).

---

## 2. Testing Tiers & Coverage Strategy

| Tier | Category | Minimum Required | Implemented Tests | Focus Area |
|---|---|---|---|---|
| **Tier 1** | **Feature Coverage** | ≥ 5 per module (30 total) | **36 tests** (6/module) | Core CRUD, workflow state changes, permissions & accounting balance |
| **Tier 2** | **Boundary & Corner Cases** | Edge cases & limits | **8 tests** | Empty inputs, invalid lookup protection, stock floors & deletion constraints |
| **Tier 3** | **Cross-Feature Interactions** | Multi-module integration | **5 tests** | Stock-Production-Sales, Procurement-AP, Logistics-Invoicing, AR-Cash |
| **Tier 4** | **Real-World Scenarios** | Complete E2E workflows | **3 scenarios** | Commercial Order-to-Cash, JIT Procurement & Custom Mfg, Order Cancellation |
| **TOTAL** | — | — | **52 tests** | **100% Pass Rate across all 52 tests** |

---

## 3. Test Execution Command

Run the entire E2E test suite using any of the following commands:

```bash
# Recommended command via npm script
npm run test:e2e

# Alternative direct execution via tsx
npx tsx scripts/run-e2e-tests.ts
```

---

## 4. API & Route Infrastructure

The test framework interacts directly with the data provider domain layer (`src/lib/data-provider.ts`), accounting engine (`src/lib/accounting.ts`), and role authorization policies (`src/lib/roles.ts`), as well as full API route handlers:

- `/api/products` & `/api/products/[id]` — Product catalog management
- `/api/inventory` — Raw materials & stock movements
- `/api/orders` & `/api/orders/[id]` — Sales orders lifecycle
- `/api/production` — Work orders (SPK) & job card execution
- `/api/delivery` — Delivery orders (Surat Jalan) & driver status
- `/api/finance` — Invoices, payments & journal entries

---

## 5. Verification Invariants

1. **State Mutation Accuracy**: Order state transitions (`PENDING` -> `PROCESSING` -> `READY` -> `SENT` -> `COMPLETED`) automatically update child SPKs, Delivery Orders, and Invoices.
2. **Stock Floor Non-Negativity**: Inventory movements enforce non-negative material stock levels.
3. **Double-Entry Bookkeeping**: Financial journal entries maintain strict accounting balance (`Sum(Debit) === Sum(Credit)`).
