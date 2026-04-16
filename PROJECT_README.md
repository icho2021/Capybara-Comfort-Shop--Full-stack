# Capybara Comfort Shop - Project README

## Project Overview

Capybara Comfort Shop is a SaaS-style mini e-commerce app built with React (client), Node.js + Express (API), and Prisma (database). Authentication uses an HTTP-only JWT cookie (`token`) as required for the course.

This repository includes **Part 2 foundation** (auth, roles, paginated products, admin create) and **Part 3 full storefront flows** (search/filter/pagination, product detail, cart, checkout, orders, reviews, admin image upload, external currency API demo).

## Tech Stack

- Client: React + Vite + React Router
- API: Node.js + Express
- Database: Prisma + SQLite
- Auth: JWT token cookie (`httpOnly`)
- External API (read-only): public currency exchange rates via API proxy (`/api/currency/external`) with upstream fallback support

## Deployed application (fill in before submission)

- **Client:** _TBD — add your deployed frontend URL_
- **API:** _TBD — add your deployed API base URL_
- **5-minute demo video (YouTube):** _TBD — add your video link (also add to the course signup sheet per README.md)_

## Local Setup

### 1) Install dependencies

```bash
cd api
npm install
cd ../client
npm install
```

### 2) Configure API environment

Check `api/.env` and ensure:

```env
DATABASE_URL="file:./dev.db"
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=part2_local_secret_change_me
```

If Vite uses another port (for example `5174`), set `CLIENT_ORIGIN` to match so CORS and cookies work.

### 3) Run migrations and seeds

```bash
cd api
npx prisma migrate dev
npm run seed:admin
npm run seed:products
```

Default admin account:

- Email: `admin@capybara.shop`
- Password: `Admin1234`

### 4) Start development servers

Terminal A (API):

```bash
cd api
npm run dev
```

Terminal B (client):

```bash
cd client
npm run dev
```

Open: `http://localhost:5173`

### 5) Tests (client)

```bash
cd client
npm test
```

## Part 2 Features (foundation)

- Register / login / logout with token cookie
- `GET /api/me` for session restore
- Paginated `GET /api/products`
- Admin-only `POST /api/products` with server-side validation
- Client: home, register, login, product list, admin product create, dark mode (CSS variables + `localStorage`)

## Part 3 Features (full functionality)

### API (high level)

- **Products:** list with `limit`, `offset`, `search`, `category`, `minPrice`, `maxPrice`; get by id; admin create/update; admin soft-delete (`isActive`)
- **Cart:** get cart; add/update/delete line items (authenticated)
- **Orders:** checkout from cart (`POST /api/orders` with `shippingAddress`); list orders (user sees own, admin sees all); get order by id; admin update order status
- **Reviews:** list/create per product; update/delete own review (admin can moderate)
- **Upload:** `POST /api/upload/image` (admin, multipart) — files served from `/api/uploads/...`
- **External API (read-only):** `GET /api/currency/external?from=&to=` — proxies to [Frankfurter](https://www.frankfurter.dev/) for reference FX rates (used on **About** page as a cross-border shopping hint)

### Client (pages)

- Home with admin-curated **Popular items**
- Products list: **300ms debounced search**, category + price filters, pagination
- Product detail: image (or placeholder), add to cart, reviews
- Cart: quantity update, **optimistic remove** with rollback on failure
- Checkout → order confirmation
- Orders list and order detail (pending vs paid/shipped columns, item images, pending-order delete)
- Admin: create/edit/delete product (optional image upload + image URL)
- Admin settings: upload/reset storefront background, choose/reorder home-page popular items
- About: **reference exchange rates** widget — user picks base currency and target codes (external API)

### Accessibility

- Lighthouse accessibility reports are saved under `accessibility_reports/`:
  - `lighthouse-home.html`
  - `lighthouse-products.html`
  - `lighthouse-about.html`
- Target requirement: score ≥ 80 for each page.

## Submission checklist (non-video items)

- [x] Part 1 file present: `PART1.md`
- [x] API + client + Prisma structure complete (`api/`, `client/`)
- [x] Role-based auth with cookie token
- [x] Search/filter/pagination + 300ms debounce
- [x] Optimistic update implemented (cart remove rollback)
- [x] External read-only API integrated (currency rates)
- [x] Unit tests (>=3 components)
- [x] Accessibility reports generated in `accessibility_reports/`
- [ ] Deployment URLs filled (client + api + db)
- [ ] YouTube demo link filled

## Quick manual test flow (demo script)

1. Browse `/products` — try search (wait for debounce), category, min/max price, pagination.
2. Open a product — read details; if logged in, submit a review.
3. Log in as a normal user — add to cart, change quantity, remove a line (optimistic UI).
4. Checkout with a shipping address — view order in **My Orders**.
5. Log in as admin — create/edit products; upload an image on create; change order status via API if you test with Postman (UI for status change can be added separately).
6. Open **About** — choose base currency and targets, then **Fetch rates** (external API).

## Notes

- Uploaded images are stored under `api/uploads/` (create automatically on first upload). For production, use object storage or a CDN; update URLs accordingly.
- Ensure `CLIENT_ORIGIN` matches your Vite dev server origin so the browser sends the auth cookie to `/api`.
