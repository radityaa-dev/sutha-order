# Sutha Corner - Full Hybrid POS & QR Ordering Upgrade PRD

**Target**: Upgrade existing `sutha-order` (Next.js 16 + Supabase + Xendit) from QR-only ordering into a full standalone Hybrid POS system replacing Accurate.
**Reference**: Must strictly adhere to existing conventions in `CONTEXT.md`.

---

## 1. CRITICAL DEVELOPMENT & UI CONSTRAINTS

1. **UI / Styling Constraint (Functional Skeleton Only)**:
   - Final UI/UX design is currently being created by a separate UI/UX Designer in Figma.
   - **DO NOT** spend effort on custom visual design, color themes, decorative CSS, custom illustrations, or complex responsive styling.
   - Build **clean, functional, barebones wireframe-level UI** using existing `shadcn/ui` primitives (`Button`, `Input`, `Label`, `Select`, `Dialog`, `AlertDialog`, `Table`, `Tabs`, `Badge`, `Card`, `Checkbox`) and basic Tailwind layout classes (`flex`, `grid`, `gap-4`, `p-4`).
   - **Decouple Logic from UI**: Keep all business logic, state management, Zod schemas, Supabase queries, and Server Actions strictly inside `lib/`, `app/api/`, and `actions.ts` so the UI layer can be easily reskinned later without touching business logic.
2. **Preserve Existing Architecture (`CONTEXT.md`)**:
   - Keep `access_token` (64-hex) for public customer URLs (`/order/[token]`) and `order_code` (`SC-YYMMDD-XXXX`) for internal/admin use. Never expose `access_token` in staff UI.
   - Keep `RowActions`, `ConfirmDialog`, and `ActionIcons` standards for all admin data tables.
   - Keep Xendit Invoice API integration (`apply_payment_status` RPC, idempotent webhook, `-R2`/`-R3` retry logic).
   - Default Tax (PB1) & Service Charge = **0%**, configurable via `store_settings` table.

---

## 2. ROLE-BASED ACCESS CONTROL (RBAC) & AUTH

Migrate from single `.env` admin credentials to **Supabase Auth** paired with a `user_profiles` table.

### Roles & Permissions Matrix
| Route / Feature | `admin` (Owner/Supv) | `kasir` (Cashier) | `dapur` (Kitchen/Bar) | `stakeholder` (Viewer) |
| :--- | :---: | :---: | :---: | :---: |
| `/dashboard` (Analytics & Summary) | Full | Redirect to `/dashboard/pos` | Redirect to `/dashboard/kitchen` | Read-Only |
| `/dashboard/pos` (Cashier POS) | Full | Full | Denied | Denied |
| `/dashboard/tables` (Floor Plan & Booking) | Full | Full | Denied | Denied |
| `/dashboard/shifts` (Open/Close Shift) | Full | Full | Denied | Denied |
| `/dashboard/kitchen` (Kitchen & Bar Queue) | Full | Read/Status | Full (`diproses`/`siap`) | Read-Only |
| `/dashboard/orders` (All Order History) | Full | Read + Request Void | Denied | Read-Only |
| `/dashboard/menus`, `/categories`, `/modifiers`, `/bundles` | Full CRUD | Toggle `is_available` only | Denied | Denied |
| `/dashboard/expenses` (Operational Expenses) | Full CRUD | Denied | Denied | Read-Only |
| `/dashboard/reports` (Sales, Top/Bottom Menu, P&L) | Full + Export | Denied | Denied | Read-Only + Export |
| `/dashboard/users` & `/dashboard/logs` (Audit) | Full | Denied | Denied | Denied |
| Void Approval & Discount Override | Direct / PIN Auth | Request Only (Needs Admin PIN) | Denied | Denied |

- **Public Routes (No Login)**:
  - `/m/[token]`: Customer QR Table Menu & Checkout.
  - `/order/[token]`: Customer Live Order Status & Open Bill Add-item (only if holding valid `access_token`).
  - `/queue`: Public Waiting Area Queue Display (shows `siap` self-pickup orders: `#short_number` + customer initials only, no prices/items).

---

## 3. DATABASE SCHEMA EXPANSION (MIGRATIONS `010` & `011`)

### 3.1 New & Modified Tables

1. **`user_profiles`** (links to `auth.users.id`):
   - `id UUID PK REFERENCES auth.users(id) ON DELETE CASCADE`
   - `full_name TEXT NOT NULL`
   - `email TEXT UNIQUE NOT NULL`
   - `role TEXT NOT NULL CHECK (role IN ('admin', 'kasir', 'dapur', 'stakeholder'))`
   - `auth_pin_hash TEXT` (6-digit hashed PIN for `admin` to authorize discounts/voids on Cashier POS screen)
   - `is_active BOOLEAN DEFAULT true`
   - `created_at TIMESTAMPTZ DEFAULT now()`

2. **`store_settings`** (single-row config):
   - `id INT PK DEFAULT 1 CHECK (id = 1)`
   - `tax_percentage NUMERIC(5,2) DEFAULT 0`
   - `online_payment_timeout_minutes INT DEFAULT 15`
   - `reservation_grace_minutes INT DEFAULT 30`

3. **`categories` (Alter)**:
   - Add `station TEXT NOT NULL DEFAULT 'dapur' CHECK (station IN ('dapur', 'bar'))`

4. **`menus` (Alter)**:
   - Add `description TEXT`
   - Add `is_active BOOLEAN DEFAULT true` (soft-delete protection for menus with historical orders)
   - Add `is_seasonal BOOLEAN DEFAULT false`, `seasonal_start DATE`, `seasonal_end DATE`

5. **`bundles` & `bundle_items` (New)**:
   - `bundles`: `id UUID PK`, `name TEXT NOT NULL`, `description TEXT`, `price NUMERIC NOT NULL`, `is_active BOOLEAN DEFAULT true`, `created_at TIMESTAMPTZ`
   - `bundle_items`: `id UUID PK`, `bundle_id UUID FK`, `menu_id UUID FK`, `qty INT NOT NULL DEFAULT 1`

6. **`tables` (Alter)**:
   - Add `area TEXT DEFAULT 'main'` (`main`, `vip`, `bar`, `outdoor`)
   - Add `capacity INT DEFAULT 4`
   - Add `status TEXT DEFAULT 'kosong' CHECK (status IN ('kosong', 'terisi', 'dipesan'))`

7. **`shifts` (New)**:
   - `id UUID PK`, `user_id UUID FK user_profiles(id)`
   - `opened_at TIMESTAMPTZ DEFAULT now()`, `opening_cash NUMERIC NOT NULL DEFAULT 0`
   - `closed_at TIMESTAMPTZ`, `total_cash NUMERIC DEFAULT 0`, `total_non_cash NUMERIC DEFAULT 0`
   - `counted_cash NUMERIC`, `cash_difference NUMERIC`
   - `status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed'))`

8. **`orders` (Alter)**:
   - Add `short_number INT NOT NULL` (daily resetting sequence `1, 2, 3...` formatted as `#001` in UI)
   - Add `order_source TEXT NOT NULL DEFAULT 'qr_table' CHECK (order_source IN ('qr_table', 'pos_cashier'))`
   - Add `serving_method TEXT NOT NULL DEFAULT 'ambil_sendiri' CHECK (serving_method IN ('ambil_sendiri', 'antar_meja', 'antar_gedung'))`
   - Add `payment_mode TEXT NOT NULL DEFAULT 'bayar_sekarang' CHECK (payment_mode IN ('bayar_sekarang', 'open_bill'))`
   - Add `open_bill_status TEXT DEFAULT 'none' CHECK (open_bill_status IN ('none', 'pending_approval', 'approved'))`
   - Add `discount_amount NUMERIC DEFAULT 0`, `discount_reason TEXT`, `discount_approved_by UUID FK user_profiles(id)`
   - Add `tax_amount NUMERIC DEFAULT 0`
   - Add `parent_order_id UUID FK orders(id)` (traceability for split/merge bill)
   - Add `created_by UUID FK user_profiles(id)`
   - Add `accepted_at TIMESTAMPTZ`, `ready_at TIMESTAMPTZ`, `completed_at TIMESTAMPTZ`

9. **`order_items` (Alter)**:
   - Make `menu_id` nullable, add `bundle_id UUID FK bundles(id)` (constraint: either `menu_id` or `bundle_id` is non-null).

10. **`payments` (Alter)**:
    - Add `method TEXT DEFAULT 'xendit_online' CHECK (method IN ('xendit_online', 'cash', 'qris_manual', 'transfer', 'edc_card'))`
    - Add `shift_id UUID FK shifts(id)`
    - Add `confirmed_by UUID FK user_profiles(id)`
    - Add `cash_received NUMERIC`, `change_amount NUMERIC`

11. **`void_logs`, `reservations`, `expenses`, `activity_logs` (New)**:
    - `void_logs`: `id UUID PK`, `order_id UUID FK`, `requested_by UUID FK`, `approved_by UUID FK`, `reason TEXT NOT NULL`, `status TEXT CHECK (status IN ('pending', 'approved', 'rejected'))`, `created_at TIMESTAMPTZ`
    - `reservations`: `id UUID PK`, `table_id UUID FK`, `customer_name TEXT NOT NULL`, `pax_count INT NOT NULL`, `booking_time TIMESTAMPTZ NOT NULL`, `status TEXT DEFAULT 'dipesan' CHECK (status IN ('dipesan', 'hadir', 'batal', 'tidak_hadir'))`, `notes TEXT`, `created_by UUID FK`
    - `expenses`: `id UUID PK`, `expense_date DATE NOT NULL`, `category TEXT NOT NULL`, `amount NUMERIC NOT NULL`, `description TEXT`, `recorded_by UUID FK`, `created_at TIMESTAMPTZ`
    - `activity_logs`: `id UUID PK`, `user_id UUID FK`, `action TEXT NOT NULL`, `entity TEXT NOT NULL`, `entity_id TEXT`, `details JSONB`, `created_at TIMESTAMPTZ DEFAULT now()`

---

## 4. CORE BUSINESS RULES & RPC LOGIC

1. **Controlled Open Bill (Anti Dine-and-Dash)**:
   - Customer QR orders with `payment_mode = 'bayar_sekarang'` stay `pending` until Xendit webhook confirms `paid` (auto-cancel if unpaid > 15 mins), then transition to `order_status = 'accepted'` (`Diterima`) and appear on Kitchen/Bar queues.
   - Customer QR orders with `payment_mode = 'open_bill'` enter with `open_bill_status = 'pending_approval'` and **DO NOT** go to Kitchen/Bar until a Cashier clicks "Konfirmasi Open Bill" (`open_bill_status = 'approved'`, `order_status = 'accepted'`).
   - POS Cashier orders with `payment_mode = 'open_bill'` are immediately `open_bill_status = 'approved'` and `order_status = 'accepted'`.
   - Customer holding the valid `access_token` on `/order/[token]` can append additional items to an `approved` unpaid `open_bill` order (via RPC `append_open_bill_items`), immediately routing new items to Kitchen/Bar.
2. **Shift Enforcement**:
   - Cashier cannot accept/settle payments (`cash`, `qris_manual`, `transfer`, `edc_card`) unless they have an active `status = 'open'` row in `shifts`.
   - Closing a shift calculates `expected_cash = opening_cash + sum(cash payments in shift)` and records `cash_difference = counted_cash - expected_cash`. Closed shifts are immutable.
3. **30-Minute SLA Overdue Indicator**:
   - Any active order in `accepted` or `preparing` where `now() - accepted_at > interval '30 minutes'` must display a visual "TERLAMBAT (>30m)" badge on Cashier POS and Kitchen/Bar screens.
4. **PIN-Authorized Discount & Void**:
   - Applying a discount (`discount_amount > 0`) or approving a void requires verifying an active `admin` user's 6-digit `auth_pin_hash` (via server-side RPC/API) + mandatory `reason` string. Voided orders are excluded from sales totals and written to `void_logs` & `activity_logs`.
5. **Table Operations (Move, Split, Merge, Reservation)**:
   - **Move Table**: Updates `table_id` on unpaid order, updates old table `status = 'kosong'` (if no other active orders) and new table `status = 'terisi'`.
   - **Split Bill**: Moves selected `order_items` into a new `orders` record with `parent_order_id` pointing to original order and recalculates totals for both.
   - **Merge Bill**: Combines items from source unpaid order into target unpaid order and marks source order `cancelled` (merged).
   - **Reservations**: Prevents overlapping bookings on the same table; bookings > 30 mins past `booking_time` without `hadir` status can be auto-released to `tidak_hadir`.
6. **Thermal Receipt & Kitchen Ticket Printing**:
   - Implement `lib/print/thermal.ts` supporting:
     1. Web Bluetooth API (`navigator.bluetooth`) ESC/POS 58mm formatting (for Chromium on Windows/Android).
     2. Clean `@media print` 58mm fallback window (for iOS/Safari/any browser).
   - Separates Kitchen ticket (`station = 'dapur'`) and Bar ticket (`station = 'bar'`), and prints customer receipt with `#short_number` + QR code linking to `/order/[access_token]`.