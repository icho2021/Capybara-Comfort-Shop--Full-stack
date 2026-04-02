# Capybara Comfort Shop - Project README

## Project Overview

Capybara Comfort Shop is a SaaS-style mini e-commerce app built with React (client), Node.js + Express (API), and Prisma (database).
This implementation currently focuses on the Part 2 foundation: token-cookie authentication, role checks, paginated product listing, product insertion, and core client pages.

## Tech Stack

- Client: React + Vite + React Router
- API: Node.js + Express
- Database: Prisma + SQLite
- Auth: JWT token cookie (`httpOnly`)

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

### 3) Run migration and seed admin user

```bash
cd api
npx prisma migrate dev
npm run seed:admin
```

Default admin account:
- Email: `admin@capybara.shop`
- Password: `Admin1234`

Role note:
- Admin users can create products from `/products/new`.
- Regular users can register/login and browse products, but cannot create products (API returns `403` for non-admin role).

### 4) Start development servers

Terminal A:

```bash
cd api
npm run dev
```

Terminal B:

```bash
cd client
npm run dev
```

Open: `http://localhost:5173`

## Part 2 Features Implemented

### API

- Prisma models: `User` (with `role`), `Product`, `Order`
- Health endpoint: `GET /api/ping`
- Authentication:
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/logout`
- Security middleware:
  - `requireAuth`
  - `requireRole(role)`
- Products:
  - `GET /api/products?limit=&offset=` (pagination)
  - `POST /api/products` (authenticated + admin only + server-side validation)

### Client

- Home page (`/`) with dark mode toggle
- Register page (`/register`) with client-side validation
- Login page (`/login`)
- Product list page (`/products`) with loading/error/empty states
- Product insertion page (`/products/new`) with client-side validation
- Theme persistence via `localStorage`

## Quick Manual Test Flow

1. Register a normal user at `/register`.
2. Login with that user and try `/products/new` (should be blocked by role restriction).
3. Login as admin (`admin@capybara.shop`) and create a product.
4. Open `/products` and verify list + pagination behavior.
5. Toggle dark mode and refresh to verify persistence.
