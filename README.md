# Capybara Comfort Shop

A full-stack e-commerce demo built with React, Node.js/Express, and Prisma.

## Live Demo

- Client: https://capybara-comfort-shop.vercel.app
- API: https://capybara-comfort-shop-web.onrender.com/api
- Demo video (YouTube): https://www.youtube.com/watch?v=sDeguNihffQ

## Features

- JWT cookie authentication (`httpOnly`) with role-based access (`admin`, `user`)
- Product browsing with pagination, category/price filters, and debounced search
- Product details, cart, checkout, order history, and reviews
- Admin product CRUD, storefront settings, and image upload
- External currency rate integration via API proxy
- Dark mode with `localStorage` persistence
- Loading/error/empty states across data-fetching pages
- Optimistic update with rollback (cart item remove)

## Tech Stack

- Frontend: React, Vite, React Router
- Backend: Node.js, Express
- Database: Prisma (SQLite for local development, PostgreSQL in production)
- Testing: Vitest + React Testing Library

## Project Structure

- `client/` - frontend source code
- `api/` - Express API and Prisma schema/migrations
- `accessibility_reports/` - Lighthouse reports

## Local Development

### 1) Install dependencies

```bash
cd api && npm install
cd ../client && npm install
```

### 2) Configure environment

Create or update `api/.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=change_me
```

### 3) Prepare database and seed data

```bash
cd api
npx prisma migrate dev
npm run seed:admin
npm run seed:products
```

Default admin account:

- Email: `admin@capybara.shop`
- Password: `Admin1234`

### 4) Run servers

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

### 5) Run tests

```bash
npm test --prefix client
```

## Quick Manual Test Flow

1. Browse `/products` and verify search, category/price filters, and pagination.
2. Open a product detail page and add item(s) to cart.
3. Register or log in as a normal user, then update quantity and remove an item in cart.
4. Complete checkout with a shipping address and verify order appears in order history.
5. Log in as admin and verify product create/edit/delete plus image upload.
6. Open About page and fetch currency rates from external API integration.

## Notes

- Uploaded files are stored in `api/uploads/`. For production-grade persistence, use object storage (for example S3 or Cloudinary).
- If frontend and API run on different origins, ensure `CLIENT_ORIGIN` and deployment environment variables are configured correctly for CORS and cookies.
