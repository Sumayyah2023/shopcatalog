# CLAUDE.md — ShopCatalog

AI assistant guide for the ShopCatalog repository. Read this before making any changes.

---

## Project Overview

ShopCatalog is a containerized e-commerce product catalog application:

- **Backend**: Node.js / Express 5 REST API
- **Database**: PostgreSQL 16 with Redis 7 caching
- **Frontend**: Vanilla JS + HTML/CSS served by Nginx
- **Orchestration**: Docker Compose
- **CI/CD**: Jenkins pipeline

---

## Repository Structure

```
shopcatalog/
├── backend/
│   ├── src/
│   │   ├── app.js                # Express app entry point & middleware stack
│   │   ├── config/
│   │   │   ├── db.js             # PostgreSQL connection pool (pg.Pool)
│   │   │   ├── redis.js          # Redis client setup
│   │   │   └── schema.sql        # Database schema + seed data (source of truth)
│   │   ├── middleware/
│   │   │   ├── auth.js           # JWT verification + admin role guard
│   │   │   └── errorHandler.js   # Global error handler (last middleware)
│   │   └── routes/
│   │       ├── auth.js           # POST /auth/register, POST /auth/login
│   │       ├── products.js       # CRUD /products — Redis cached reads
│   │       ├── categories.js     # GET /categories — Redis cached
│   │       └── cart.js           # Cart CRUD — requires authenticated user
│   ├── package.json
│   ├── Dockerfile                # Node 20-Alpine, non-root appuser
│   └── .dockerignore
├── frontend/
│   ├── index.html                # Product catalog (filtering, search, pagination)
│   ├── product.html              # Product detail page
│   ├── cart.html                 # Cart + order summary
│   ├── js/
│   │   ├── api.js                # Centralised API client (auto-injects JWT)
│   │   └── products.js           # Frontend application logic
│   ├── css/
│   │   └── style.css             # Main stylesheet
│   ├── nginx.conf                # Nginx config with gzip + cache headers
│   └── Dockerfile                # Nginx-Alpine
├── docker-compose.yml            # Full stack orchestration
├── Jenkinsfile                   # CI/CD pipeline definition
├── .env.example                  # Required environment variables template
└── .gitignore
```

---

## Running the Application

### Prerequisites

- Docker and Docker Compose installed
- Copy `.env.example` to `.env` and fill in secrets before first run

### Start the full stack

```bash
cp .env.example .env          # configure secrets first
docker-compose up --build
```

| Service  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:3000 |
| Backend  | http://localhost:5000 |
| Health   | http://localhost:5000/health |

### Development (backend only, without Docker)

```bash
cd backend
npm install
npm run dev       # nodemon auto-reload
```

Requires local PostgreSQL and Redis running and `.env` configured.

---

## Environment Variables

Defined in `.env.example`. All are required for the backend container:

| Variable            | Description                          |
|---------------------|--------------------------------------|
| `POSTGRES_DB`       | Database name (`shopcatalog`)        |
| `POSTGRES_USER`     | DB username                          |
| `POSTGRES_PASSWORD` | DB password — change in production   |
| `JWT_SECRET`        | Long random string for JWT signing   |
| `JWT_EXPIRES_IN`    | Token lifetime (default `7d`)        |
| `NODE_ENV`          | `development` or `production`        |

---

## API Reference

Base path: `/api`

### Authentication — `/api/auth`

| Method | Path              | Auth     | Description                |
|--------|-------------------|----------|----------------------------|
| POST   | `/auth/register`  | None     | Create account             |
| POST   | `/auth/login`     | None     | Returns JWT token          |

### Products — `/api/products`

| Method | Path              | Auth     | Description                |
|--------|-------------------|----------|----------------------------|
| GET    | `/products`       | None     | List (cached, filterable)  |
| GET    | `/products/:id`   | None     | Single product (cached)    |
| POST   | `/products`       | Admin    | Create product             |
| PUT    | `/products/:id`   | Admin    | Update product             |
| DELETE | `/products/:id`   | Admin    | Delete product             |

Query params for `GET /products`: `category`, `search`, `min_price`, `max_price`, `page`, `limit`.

### Categories — `/api/categories`

| Method | Path           | Auth | Description          |
|--------|----------------|------|----------------------|
| GET    | `/categories`  | None | List all (cached)    |

### Cart — `/api/cart`

| Method | Path              | Auth      | Description              |
|--------|-------------------|-----------|--------------------------|
| GET    | `/cart`           | User JWT  | Get current user's cart  |
| POST   | `/cart`           | User JWT  | Add/update item          |
| DELETE | `/cart/:itemId`   | User JWT  | Remove item              |

### System

| Method | Path      | Description                |
|--------|-----------|----------------------------|
| GET    | `/health` | Health probe for Docker    |

---

## Database

### Schema (PostgreSQL 16)

Defined in `backend/src/config/schema.sql` — this is the source of truth.

```
users        → id, name, email (UNIQUE), password_hash, role, created_at
categories   → id, name, slug (UNIQUE)
products     → id, name, description, price, stock, image_url, category_id (FK), created_at
cart_items   → id, user_id (FK), product_id (FK), quantity, added_at
             → UNIQUE(user_id, product_id), ON DELETE CASCADE
```

User roles: `user` (default) | `admin`

### Migrations

There is no migration framework. Schema changes are made directly in `schema.sql`. When modifying:

1. Update `schema.sql`
2. If changing existing tables, add `ALTER TABLE` statements or recreate with new schema
3. Seed data is embedded in `schema.sql` — adjust as needed
4. Rebuild/restart the db container to apply: `docker-compose up --build db`

---

## Caching (Redis)

- **TTL**: 60 seconds for products and categories
- **Cache key pattern**: `products:${JSON.stringify(req.query)}`
- **Invalidation**: All cache is flushed (`flushDb`) on any product write (POST/PUT/DELETE)
- Redis client is in `backend/src/config/redis.js`

---

## Authentication & Authorization

- JWT tokens: `Authorization: Bearer <token>` header
- Token payload: `{ id, email, role }`
- Middleware in `backend/src/middleware/auth.js`:
  - `authenticateToken` — verifies JWT, attaches `req.user`
  - `requireAdmin` — checks `req.user.role === 'admin'`
- Passwords hashed with bcryptjs (salt rounds: 12)

---

## Key Conventions

### Backend

- **All DB queries use parameterized statements** — never string-interpolate user input into SQL
- **Async route handlers use try/catch** and call `next(error)` on failure
- **Global error handler** (`middleware/errorHandler.js`) is the last middleware in `app.js`
- **Rate limiting**: 100 requests per 15 minutes applied to all `/api/*` routes
- **Security headers**: Helmet applied globally
- **CORS**: Currently open to all origins — restrict before production deployment

### Frontend

- `js/api.js` is the single point of contact with the backend — add all new API calls here
- JWT token stored in `localStorage` as `token`; user info as `user`
- The API base URL is hardcoded to `http://localhost:5000/api` in `api.js` — parameterise if deploying elsewhere
- Toast notifications used for user feedback — use the existing toast helper, don't `alert()`

### Docker

- Backend image runs as non-root user `appuser`
- Database data persisted via named Docker volume
- Health checks defined for all services; backend waits for db and redis to be healthy before starting

---

## Testing

Jest and Supertest are installed but **no test files currently exist**.

```bash
cd backend
npm test          # runs jest with coverage
```

When adding tests:
- Place unit/integration tests in `backend/src/__tests__/` or alongside source files as `*.test.js`
- Use `supertest` for route integration tests — see Supertest docs for Express 5 compatibility notes
- Aim for coverage of route handlers, middleware, and any utility functions

---

## CI/CD (Jenkins)

The `Jenkinsfile` defines a pipeline with these stages:

1. **Checkout** — pulls latest code
2. **Validate** — `docker-compose config` validation
3. **Build Images** — `docker-compose build`
4. **Deploy** — stops old containers, starts new ones
5. **Health Check** — verifies backend (`:5000/health`) and frontend (`:3000`) via `172.17.0.1` (Docker host gateway)
6. **Cleanup** — removes dangling images

Deployments are triggered on every push. No branch restrictions are currently configured in the Jenkinsfile.

---

## Common Tasks

### Add a new API endpoint

1. Add the route handler in the appropriate file under `backend/src/routes/`
2. Register the route in `backend/src/app.js` if adding a new route file
3. Apply `authenticateToken` and/or `requireAdmin` middleware as needed
4. Use parameterized queries for any DB interaction
5. Invalidate relevant Redis cache keys on write operations

### Add a new database table

1. Add `CREATE TABLE IF NOT EXISTS` to `backend/src/config/schema.sql`
2. Add foreign keys and indexes as needed
3. Rebuild the db container to apply

### Add frontend functionality

1. Add the API call to `js/api.js`
2. Implement the UI logic in `js/products.js` or a new JS file
3. Use existing toast and loading skeleton patterns for UX consistency

---

## Known Limitations / Areas for Improvement

- No request validation middleware (e.g., express-validator) — input validation is ad hoc
- CORS is open to all origins (`*`) — should be restricted to known domains in production
- Frontend API base URL is hardcoded — needs environment variable support for multi-environment deploys
- No test coverage exists — test suite is unimplemented
- Cart has no checkout/payment flow
- No logging aggregation — only Morgan HTTP logs to stdout
