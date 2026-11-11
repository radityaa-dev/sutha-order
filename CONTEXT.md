# Sutha Corner - Complete System Context for AI

**Version**: 1.0
**Last Updated**: 2026-11-11
**Stack**: Next.js 16, Supabase (PostgreSQL + Auth + Storage), Xendit, Tailwind CSS, shadcn/ui

---

## 1. Project Overview

A QR-code based food ordering system ("Sutha Corner") with:
- **Customer-facing**: Mobile-first menu browsing, add-on modifiers, cart, checkout, payment, order status.
- **Admin Panel**: Menu/Category/Table/Modifier management, Real-time Kitchen Queue, Dashboard stats.
- **Security**: Server-side price calculation, unguessable access tokens, RLS, Service Role isolation, rate limiting.
- **Payment**: Xendit Invoice API (Test mode) with idempotent webhook handling, retry logic for expired invoices.

---

## 2. Directory Structure

```text
sutha-order/
├── app/
│   ├── (auth)/login/page.tsx           # Admin login page
│   ├── (dashboard)/                    # Protected admin layout group
│   │   ├── layout.tsx                  # Sidebar + Header + Idle Logout
│   │   ├── page.tsx                    # Dashboard (Stats: Today's Orders, Sales, Kitchen Queue)
│   │   ├── categories/page.tsx         # Category CRUD
│   │   ├── menus/page.tsx              # Menu CRUD + Add-on assignment
│   │   ├── modifiers/page.tsx          # Modifier Group & Option CRUD
│   │   ├── tables/page.tsx             # Table CRUD + QR Code Generator
│   │   └── orders/page.tsx             # Kitchen Queue (Real-time) + Order History
│   ├── m/[token]/                      # Customer Menu (Public)
│   │   ├── page.tsx                    # Server Component: Menus grouped by Category
│   │   ├── actions.ts                  # Server Actions: getTableByToken, getPublishedMenus
│   │   └── loading.tsx
│   ├── order/[token]/                  # Customer Order Status (Public)
│   │   └── page.tsx                    # Server Component: Initial data fetch
│   └── api/
│       ├── orders/route.ts             # POST Create Order (validates optionIds, calls RPC)
│       ├── orders/[token]/route.ts     # GET Order Status (Rate limited 60/min, minimal public fields)
│       ├── orders/[token]/pay/route.ts # POST Create Xendit Invoice (Retry logic R2/R3)
│       ├── orders/[token]/check/route.ts # POST Fallback status sync
│       ├── xendit/webhook/route.ts     # POST Xendit Callback (Calls syncPayment)
│       └── admin/orders/route.ts       # GET Admin Orders (with Realtime channel)
├── components/
│   ├── admin/
│   │   ├── row-actions.tsx             # Unified Action Row (Primary Button + Dropdown Menu)
│   │   ├── confirm-dialog.tsx          # Standardized AlertDialog for destructive actions
│   │   ├── action-icons.ts             # Central Lucide Icon mapping
│   │   ├── category-actions.tsx        # RowActions wrapper for Categories
│   │   ├── menu-actions.tsx            # RowActions wrapper for Menus
│   │   ├── modifier-actions.tsx        # RowActions wrapper for Modifiers
│   │   ├── table-actions.tsx           # RowActions wrapper for Tables
│   │   ├── order-actions.tsx           # RowActions wrapper for Orders (Dynamic status buttons)
│   │   ├── category-form.tsx           # Dialog Form (Create/Edit Category)
│   │   ├── menu-form.tsx               # Dialog Form (Create/Edit Menu + Image Upload + Add-on checkboxes)
│   │   ├── modifier-form.tsx           # Dialog Form (Create/Edit Modifier Group + Dynamic Options Array)
│   │   ├── table-form.tsx              # Dialog Form (Create/Edit Table)
│   │   ├── table-qrcode.tsx            # QR Code Dialog (Width 800, EC Level M, Margin 2)
│   │   ├── sidebar.tsx                 # Navigation
│   │   ├── idle-logout.tsx             # Client-side session timeout watchdog
│   │   └── delete-menu-button.tsx      # Legacy (being phased out)
│   ├── customer/
│   │   ├── item-sheet.tsx              # Drawer (Bottom Sheet 90vh) for Add-on selection
│   │   ├── cart-sheet.tsx              # Bottom Sheet Cart (Persistent per table token)
│   │   ├── order-status-client.tsx     # Polling UI (Stepper, Ready Banner, Retry Pay)
│   │   ├── add-button.tsx              # Wrapper triggering ItemSheet
│   │   └── pay-button.tsx              # Legacy (replaced by order-status-client logic)
│   └── ui/                             # shadcn/ui components (Button, Dialog, Table, Dropdown, etc.)
├── lib/
│   ├── supabase/
│   │   ├── admin.ts                    # Service Role Client (Server only)
│   │   └── client.ts                   # Anon Client (Client side Realtime)
│   ├── store.ts                        # Zustand Cart Store (Persisted, Migration safe, LineId logic)
│   ├── auth.ts                         # Admin Session verification (Cookie based)
│   ├── auth-config.ts                  # SESSION_MAX_AGE (12h), IDLE_MINUTES
│   ├── format.ts                       # formatRupiah, date helpers
│   ├── order-schema.ts                 # Zod validation for API payloads
│   ├── types.ts                        # Shared TypeScript interfaces
│   ├── payments/
│   │   ├── syncPayment.ts              # Calls RPC apply_payment_status
│   │   └── xendit.ts                   # Xendit API wrapper (createInvoice, getInvoice, listInvoices)
│   └── rate-limit.ts                   # (Optional) In-memory rate limiter for public API
├── middleware.ts                       # Admin Session Protection + Redirects
├── next.config.ts                      # Headers (no-store for /admin/*), Images, Turbopack
├── supabase/
│   ├── migrations/
│   │   ├── 001_init.sql                # Core Tables, RLS, Storage Bucket
│   │   ├── 002_storage_policies.sql
│   │   ├── 003_create_order_function.sql (Superseded by 006/008)
│   │   ├── 004_alter_orders_add_columns.sql
│   │   ├── 005_modifiers.sql           # modifier_groups, modifier_options, menu_modifier_groups
│   │   ├── 006_update_create_order.sql (Superseded by 008)
│   │   ├── 007_create_order_modifiers.sql (Superseded by 008)
│   │   ├── 008_order_access_token.sql  # FINAL create_order: returns JSON {code, token}, validates options, calc price
│   │   └── 009_payment_resilience.sql  # apply_payment_status RPC, Unique Indexes, external_id
│   └── seed.sql                        # Initial Categories, Menus, Tables (Base62 tokens), Modifiers
└── package.json
```

---

## 3. Database Schema (PostgreSQL)

### Core Tables
| Table | Key Columns | Purpose |
| :--- | :--- | :--- |
| `categories` | `id`, `name`, `sort_order` | Menu grouping |
| `menus` | `id`, `category_id`, `name`, `price`, `image_url`, `is_available` | Products |
| `tables` | `id`, `name`, `token` (Base62 12-char), `is_active` | Physical tables + QR identity |
| `modifier_groups` | `id`, `name`, `selection_type` (single/multiple), `is_required`, `min_select`, `max_select`, `sort_order` | Add-on Groups |
| `modifier_options` | `id`, `group_id`, `name`, `price_delta`, `is_available`, `sort_order` | Add-on Options |
| `menu_modifier_groups` | `menu_id`, `group_id` | Many-to-Many Menu <-> Modifier Group |
| `orders` | `id`, `order_code` (SC-YYMMDD-XXXX), `access_token` (64-char hex), `table_id`, `customer_name`, `notes`, `total`, `order_status`, `payment_status`, `created_at` | Order Header |
| `order_items` | `id`, `order_id`, `menu_id`, `menu_name`, `base_price`, `price` (final), `qty`, `notes`, `modifiers` (JSONB) | Order Lines (Snapshot) |
| `payments` | `id`, `order_id`, `external_id`, `transaction_id` (Xendit ID), `amount`, `status`, `raw_payload`, `paid_at` | Payment Transactions |

### Critical Indexes & Constraints
- `orders.access_token` UNIQUE (Public Access Key)
- `orders.order_code` UNIQUE (Display Key)
- `payments.transaction_id` UNIQUE (Idempotency)
- `payments` Partial Unique Index: `UNIQUE (order_id) WHERE status = 'pending'` (Prevents double invoice)

---

## 4. PostgreSQL RPC Functions (Server-Side Logic)

### `create_order(p_table_token, p_customer_name, p_notes, p_items JSONB) RETURNS JSONB`
**Signature Stability**: Kept as `(text, text, text, jsonb)` returning `jsonb` (`{order_code, access_token}`).
**Logic**:
1. Validate Table (`is_active`).
2. Generate unique `order_code` (retry loop on collision).
3. Generate `access_token` (`replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')`).
4. Insert Order (`pending`/`pending`, total=0).
5. Loop `p_items` (`menu_id`, `qty`, `notes`, `option_ids UUID[]`):
   - Fetch Menu (must be `is_available`).
   - Base Price = `menu.price`.
   - For each Modifier Group linked to Menu:
     - Count selected valid options (`option_ids` IN group AND `is_available`).
     - Enforce `min_select` / `max_select` / `is_required`.
     - Sum `price_delta` into Unit Price.
     - Build `modifiers` JSONB snapshot `[{group_name, option_name, price_delta}]`.
   - Insert `order_items` (snapshot `base_price`, final `price`, `modifiers`).
   - Accumulate Total.
6. Update Order Total.
7. Return `{ order_code, access_token }`.

### `apply_payment_status(p_invoice_id, p_status, p_amount, p_method, p_paid_at, p_payload) RETURNS TEXT`
**Security**: `SECURITY DEFINER`, `SET search_path = public, pg_temp`, `EXECUTE` only for `service_role`.
**Logic**:
1. `SELECT ... FROM payments WHERE transaction_id = p_invoice_id FOR UPDATE`.
2. If not found -> `'not_found'`.
3. If current status = `'paid'` -> `'noop'` (Idempotent).
4. `SELECT ... FROM orders WHERE id = payment.order_id FOR UPDATE`.
5. Calculate `sum(price * qty)` from `order_items`.
6. **Validate Amount**: `p_amount == order.total AND order.total == calculated_sum`.
   - If Mismatch: Update Payment status `'amount_mismatch'`, save payload -> Return `'amount_mismatch'`.
7. Update Payment (`status`, `amount`, `paid_at`, `raw_payload`).
8. Update Order (`payment_status`, `order_status` if paid -> `paid`/`preparing`).
9. Return `'updated'`.

---

## 5. API Routes Specification

| Route | Method | Auth | Description |
| :--- | :--- | :--- | :--- |
| `/api/orders` | POST | Public (Table Token) | Create Order. Body: `{ token, name, notes, items: [{menuId, qty, notes, optionIds}] }`. Validates Zod. Calls RPC. Returns `{ order_code, access_token }`. |
| `/api/orders/[token]` | GET | Public (Rate Limited 60/min/IP) | Fetch Order for Status Page. Selects minimal public fields. 404 if token invalid. |
| `/api/orders/[token]/pay` | POST | Public (Access Token) | Create Xendit Invoice. Checks: Table Active, Order not Cancelled, Max 3 Retries (`external_id` suffix -R2/-R3). Resets status to `pending` if expired. Returns `{ invoiceUrl }`. |
| `/api/orders/[token]/check` | POST | Public | Fallback Polling. Finds Payment by `transaction_id` or Xendit `external_id` search. Calls `syncPayment`. |
| `/api/xendit/webhook` | POST | Signature Verified (`x-callback-token`) | Instant Callback. Calls `syncPayment`. Handles `noop` gracefully (200 OK). |
| `/api/admin/orders` | GET | Admin Session | Fetches all orders for Kitchen Queue/History. |

---

## 6. Customer Flow (Public)

1. **Entry**: Scan QR -> `/m/[table_token]`.
   - `page.tsx` (Server): Validates table, fetches Menus + Modifier Groups + Options (Single Query, `is_available=true`).
2. **Browse**: Menus grouped by Category. "Tambah" button per menu.
3. **Item Sheet** (`ItemSheet` - Drawer 90vh):
   - Image, Name, Desc, Base Price.
   - **Add-on Groups**: Radio (Single) / Checkbox (Multiple). Disabled options when `max_select` reached. Shows `+Rp price_delta`.
   - **Validation**: Required groups enforce `min_select`.
   - **Error UX**: On Submit with missing required -> `scrollIntoView` first missing group -> `.focus()` first input -> Red Border + `aria-live="polite"` message.
   - **Qty Stepper** (1-20), **Notes** (200 char).
   - **Live Total**: `(Base + Sum Deltas) * Qty`.
4. **Cart** (`CartSheet` - Zustand `localStorage` per Table Token):
   - **Line Identity**: `lineId = menuId + sorted(option_ids) + notes`.
   - Merge identical lines (Qty++). Different options/notes = New Line.
   - UI: Name, Add-on chips, Italic Notes, Unit Price, Qty Stepper, Delete.
   - Tap Line -> Re-open ItemSheet pre-filled -> "Simpan Perubahan".
5. **Checkout**: Name (Required), General Notes -> POST `/api/orders`.
6. **Redirect**: `/order/[access_token]`.

---

## 7. Order Status & Payment Flow (Customer)

1. **Page** `/order/[access_token]` (Server fetch initial + `OrderStatusClient`).
2. **Polling**: `fetch /api/orders/[token]` every 5s.
3. **UI**:
   - Stepper: `Paid` -> `Preparing` -> `Ready` -> `Completed`.
   - **Ready Banner**: Green bounce animation.
   - **Items**: Name, Qty, Add-on summary, Line Total.
4. **Payment States**:
   - **Pending**: Show "Bayar Sekarang" (Xendit Redirect).
   - **Paid**: Hide Pay Button. Show Progress.
   - **Expired**: Show **"Bayar Ulang"** (Calls `/pay` again, generates Retry Invoice) + **"Kembali ke Menu"**.
   - **Amount Mismatch**: Admin alert (Not user facing directly, but order stuck).

---

## 8. Admin Panel Features

### Authentication & Security
- **Route Groups**: `(auth)` for Login (no sidebar), `(dashboard)` for App Layout.
- **Middleware**: Verifies Session Cookie (`admin_session`). Redirects to `/admin/login` if invalid/expired.
- **Session**: HTTPOnly Cookie, `Secure`, `SameSite=Lax`, **Max Age 12 Hours**.
- **Idle Timeout**: Client-side `IdleLogout` component listens to `visibilitychange` / `mousemove` / `keydown`. Logs out after `NEXT_PUBLIC_ADMIN_IDLE_MINUTES` (default 30m).
- **Cache Control**: `next.config.ts` headers: `/admin/:path*` -> `Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate`.

### Data Management (CRUD)
All use **Server Actions** (`actions.ts`) called via `formAction` or `onClick` -> `router.refresh()`.
- **Categories**: Name, Sort Order.
- **Menus**: Name, Category, Price, Description, Image Upload (Supabase Storage `menu-images`), Availability Toggle, Add-on Group Assignment (Checkboxes).
- **Modifiers**: Group (Name, Type Single/Multi, Required, Min/Max), Options Array (Name, Price Delta, Available, Sort Order). Complex Validation (Zod Refine).
- **Tables**: Name, Token (Base62 12-char, Regeneratable), Active Toggle. QR Code Generator (Width 800, EC Level M, Margin 2).

### Kitchen Queue (`/admin/orders`)
- **Tabs**: "Antrean Dapur" (Active: Paid/Preparing/Ready) | "Semua Riwayat".
- **Real-time**: Supabase Realtime Channel `orders` -> `fetchOrders()` on change.
- **Row Actions** (`OrderActions`):
  - **Primary Button** (Variant Default, Icon + Label):
    - `Paid` -> "Mulai Dikerjakan" (ChefHat) -> `Preparing`
    - `Preparing` -> "Menu Selesai" (CheckCheck) -> `Ready`
    - `Ready` -> "Pesanan Selesai" (PackageCheck) -> `Completed`
    - `Completed/Cancelled/Expired` -> No Primary Button.
  - **Dropdown Items**: "Lihat Detail" (Eye), "Batalkan" (Ban, Destructive, only Paid/Preparing) -> `ConfirmDialog`.
- **Display**: Order Code, Customer, Time, Total, Badge Status, Items with Modifiers & Notes.

### Dashboard (`/admin`)
- Stats Cards: Today's Order Count, Today's Sales (WIB Timezone), Active Kitchen Queue Count.

---

## 9. UI Component Standards (Admin)

### `RowActions` (`components/admin/row-actions.tsx`)
**Mandatory Pattern for ALL Table Action Columns.**
```tsx
<RowActions
  primary={{ label: "Edit", icon: ActionIcons.Edit, onClick: ..., variant: "outline" }}
  items={[
    { label: "Hapus", icon: ActionIcons.Delete, destructive: true, onClick: ... }
  ]}
/>
```
- **Container**: `flex flex-row items-center justify-end gap-2 whitespace-nowrap`.
- **Primary**: `Button size="sm" variant="outline"` (Icon `mr-1.5 h-4 w-4`). Status buttons use `variant="default"`.
- **Dropdown Trigger**: `Button variant="ghost" size="icon" aria-label="Aksi lainnya"` (MoreHorizontal).
- **Dropdown Items**: Vertical stack. `flex items-center gap-2`. Icon `h-4 w-4`. Destructive = `text-destructive` + `DropdownMenuSeparator` before/after.

### `ConfirmDialog` (`components/admin/confirm-dialog.tsx`)
**Mandatory for ALL Destructive Actions (Delete, Regenerate, Cancel).**
- `AlertDialog` with `AlertDialogFooter` flex-row.
- Left: `AlertDialogCancel` ("Batal", Outline).
- Right: `AlertDialogAction` (Destructive Red, Loading Spinner support).

### `ActionIcons` (`components/admin/action-icons.ts`)
**Single Source of Truth for Lucide Icons.**
```typescript
Edit: Pencil, Delete: Trash2, ViewQR: QrCode, Regenerate: RefreshCw,
Detail: Eye, Cancel: Ban, StartCooking: ChefHat,
FinishCooking: CheckCheck, CompleteOrder: PackageCheck
```

### Form Dialogs Footer Standard
```tsx
<div className="flex justify-end gap-2 pt-4 border-t">
  <Button type="button" variant="outline" onClick={close}>Batal</Button>
  <Button type="submit" disabled={loading}>Simpan...</Button>
</div>
```

---

## 10. Client State Management

### `useCartStore` (`lib/store.ts`)
- **Persist**: `localStorage` key `sutha-cart-[tableToken]` (Handled by namespace logic in store).
- **Migration Safety**: `onRehydrateStorage` validates array structure. Resets if malformed (legacy format protection).
- **LineId Generation**: Deterministic hash of `menuId + sorted(option_group:option_name) + notes`.
- **Merge Logic**: `addItem` checks existing `lineId`. Match -> `qty++`. No Match -> Append.
- **Types**: `CartItem { lineId, id, name, price, base_price, qty, notes, modifiers: {group_name, option_name, price_delta, option_id}[] }`.

---

## 11. Environment Variables (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # Server Only (Admin Client, RPCs)

# Xendit
XENDIT_SECRET_KEY=...               # Server Only
XENDIT_WEBHOOK_TOKEN=...            # For Webhook Signature Verification
NEXT_PUBLIC_APP_URL=http://localhost:3000 # For Redirect URLs

# Admin Auth
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=...             # Bcrypt/Argon2 Hash
SESSION_MAX_AGE=43200               # 12 Hours (Seconds)
NEXT_PUBLIC_ADMIN_IDLE_MINUTES=30   # Idle Auto-Logout
```

---

## 12. Key Implementation Details & Gotchas

1.  **Price Trust**: Client sends `optionIds` only. Server RPC `create_order` fetches Menu Price + Option Deltas. Client Total is **Estimate Only**.
2.  **Access Token vs Order Code**:
    - `order_code` (SC-...): Short, Human readable, Kitchen Display, Admin UI.
    - `access_token` (64 Hex): Long, Cryptographic, Customer URLs (`/order/[token]`, `/api/orders/[token]`).
    - **Never** expose `access_token` in Admin UI. **Never** use `order_code` for Customer API lookups.
3.  **QR Code Token**: Tables use Base62 (12 chars) generated via `crypto.randomInt`. **Not UUID**. Regenerating token invalidates printed QR Codes immediately.
4.  **Modifier Snapshot**: `order_items.modifiers` (JSONB) stores `{group_name, option_name, price_delta}` at time of order. Immune to future Menu/Option changes.
5.  **Idempotent Payments**:
    - Partial Unique Index on `payments(order_id) WHERE status='pending'` prevents double "Bayar" clicks.
    - `apply_payment_status` RPC uses `FOR UPDATE` locks. Handles Webhook + Polling race conditions.
    - Retry Logic: `external_id` = `order_code` -> `order_code-R2` -> `order_code-R3`. Max 3.
5.  **Admin Session**: Cookie based. Middleware protects `(dashboard)`. `no-store` headers prevent "Back Button after Logout" caching issue.
6.  **Build Config**: Turbopack enabled. `reactCompiler: true`. `cacheComponents: false`.
7.  **TypeScript**: Strict. `RowActions` enforces `icon: LucideIcon` (Required) preventing iconless buttons.

---

## 13. Testing Checklist (Manual)

- [ ] **Customer**: Scan QR -> Add Item w/ Required Add-on (Success) -> Add Item w/o Required (Error Scroll/Focus/Toast) -> Cart Merge/Split -> Checkout -> Pay Xendit (Test Card) -> Status Page Polling -> Ready Banner.
- [ ] **Customer**: Let Invoice Expire -> "Bayar Ulang" -> New Invoice -> Pay -> Success.
- [ ] **Customer**: Direct Access `/order/[wrong_token]` -> 404. `/order/[valid_token]` -> No sensitive data (WA, etc).
- [ ] **Admin**: Login -> Idle 31 min -> Auto Logout -> Back Button -> Login Page (Not Cached Dashboard).
- [ ] **Admin**: Create Menu w/ Image -> Assign Modifiers -> Verify Customer Sheet.
- [ ] **Admin**: Kitchen Queue: Paid -> Cooking -> Ready -> Completed. Verify Realtime Update across tabs.
- [ ] **Admin**: Cancel Order (Paid/Preparing) -> Confirm Dialog -> Status Cancelled.
- [ ] **Admin**: Regenerate Table Token -> Confirm Dialog (Warns Reprint QR) -> New Token -> Old QR Fails.
- [ ] **Payment**: Webhook Duplicate Payload -> Log "Noop", Return 200. Amount Mismatch -> Status `amount_mismatch`.

---

## 14. File Change History (Recent Major Refactors)

1.  **Security**: Migration `008_order_access_token.sql` + API rewrite to use `access_token`.
2.  **Payment Resilience**: Migration `009_payment_resilience.sql` + `apply_payment_status` RPC + Retry Logic (`-R2`, `-R3`) + Idempotency Indexes.
3.  **Admin UI Standardization**:
    - Created `RowActions`, `ConfirmDialog`, `ActionIcons`.
    - Refactored `Categories`, `Menus`, `Modifiers`, `Tables`, `Orders` pages to use shared components.
    - Standardized Form Footers (Batal Left, Simpan Right).
    - Added `overflow-x-auto` to Tables, `w-px whitespace-nowrap` Action Column Header.
4.  **Customer UX**: `ItemSheet` Validation Feedback (Scroll, Focus, Highlight, Aria-Live).
5.  **QR/Token**: Base62 Generator (`crypto.randomInt`), QR Config (800px, M, Margin 2).

---

*End of Context Document. This file should be sufficient for any AI to understand the architecture, data flow, conventions, and current state of the Sutha Corner application.*