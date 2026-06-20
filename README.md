# Inventory & Order Management System

A production-ready, fully containerized full-stack application for managing
**products, customers, orders, and inventory tracking**.

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React (Vite) + React Router + Axios |
| Backend  | Python + FastAPI + SQLAlchemy       |
| Database | PostgreSQL                          |
| DevOps   | Docker + Docker Compose             |

---

## Table of contents

1. [Architecture](#architecture)
2. [Quick start (Docker Compose)](#quick-start-docker-compose)
3. [Running services individually](#running-services-individually)
4. [API reference](#api-reference)
5. [Business rules](#business-rules)
6. [Environment variables](#environment-variables)
7. [Deployment](#deployment)
8. [Submission deliverables](#submission-deliverables)

---

## Architecture

```
┌──────────────┐      HTTP/JSON      ┌──────────────┐     SQL      ┌──────────────┐
│   Frontend   │  ───────────────▶   │   Backend    │  ─────────▶  │  PostgreSQL  │
│ React + Nginx│                     │   FastAPI    │              │              │
│  (port 5173) │   ◀───────────────  │ (port 8000)  │  ◀─────────  │ (port 5432)  │
└──────────────┘                     └──────────────┘              └──────────────┘
```

```
Inventory-Management-System/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, CORS, startup, error handlers
│   │   ├── config.py        # env-driven settings
│   │   ├── database.py      # engine + session
│   │   ├── models.py        # SQLAlchemy models (+ DB constraints)
│   │   ├── schemas.py       # Pydantic validation
│   │   └── routers/         # products / customers / orders / dashboard
│   ├── Dockerfile
│   ├── .dockerignore
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/client.js    # Axios API layer
│   │   ├── context/         # toast notifications
│   │   ├── components/      # reusable UI (Modal)
│   │   └── pages/           # Dashboard, Products, Customers, Orders
│   ├── Dockerfile           # multi-stage build → nginx
│   ├── nginx.conf
│   └── .dockerignore
├── docker-compose.yml       # frontend + backend + db
├── .env.example
└── README.md
```

---

## Quick start (Docker Compose)

**Prerequisites:** Docker Desktop (includes Docker Compose).

```bash
# 1. Copy the environment template and adjust if you like
cp .env.example .env

# 2. Build and start all three services
docker compose up --build
```

Then open:

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **Interactive API docs (Swagger):** http://localhost:8000/docs

Stop with `Ctrl+C`, and `docker compose down` to remove the containers. The
PostgreSQL data survives restarts thanks to the named volume
`inventory_postgres_data`. To wipe it, run `docker compose down -v`.

---

## Running services individually

### Backend (without Docker)

```bash
cd backend
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# point DATABASE_URL at a running PostgreSQL instance
export DATABASE_URL="postgresql+psycopg2://postgres:postgres@localhost:5432/inventory"
uvicorn app.main:app --reload
```

### Frontend (without Docker)

```bash
cd frontend
npm install
echo "VITE_API_URL=http://localhost:8000" > .env
npm run dev
```

---

## API reference

Base URL: `/` (e.g. `http://localhost:8000`)

### Products

| Method | Path             | Description            |
| ------ | ---------------- | ---------------------- |
| POST   | `/products`      | Create a product       |
| GET    | `/products`      | List all products      |
| GET    | `/products/{id}` | Get a product by ID    |
| PUT    | `/products/{id}` | Update a product       |
| DELETE | `/products/{id}` | Delete a product       |

```jsonc
// POST /products
{ "name": "Wireless Mouse", "sku": "WM-001", "price": 24.99, "quantity": 100 }
```

### Customers

| Method | Path              | Description           |
| ------ | ----------------- | --------------------- |
| POST   | `/customers`      | Create a customer     |
| GET    | `/customers`      | List all customers    |
| GET    | `/customers/{id}` | Get a customer by ID  |
| DELETE | `/customers/{id}` | Delete a customer     |

```jsonc
// POST /customers
{ "full_name": "Jane Doe", "email": "jane@example.com", "phone": "+1 555 123 4567" }
```

### Orders

| Method | Path           | Description                          |
| ------ | -------------- | ------------------------------------ |
| POST   | `/orders`      | Create an order (reduces stock)      |
| GET    | `/orders`      | List all orders                      |
| GET    | `/orders/{id}` | Get an order by ID                   |
| DELETE | `/orders/{id}` | Cancel an order (restores stock)     |

```jsonc
// POST /orders  — total is calculated by the backend, never sent by the client
{
  "customer_id": 1,
  "items": [
    { "product_id": 1, "quantity": 2 },
    { "product_id": 3, "quantity": 1 }
  ]
}
```

### Dashboard

| Method | Path         | Description                                       |
| ------ | ------------ | ------------------------------------------------- |
| GET    | `/dashboard` | Totals + low-stock products for the home screen   |

---

## Business rules

All rules from the assessment are enforced at both the application layer and,
where possible, the database layer:

| Rule                                                    | How it is enforced                                                                 |
| ------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Product SKU must be unique                               | App check + `UNIQUE` constraint → `409 Conflict`                                   |
| Customer email must be unique                           | App check + `UNIQUE` constraint → `409 Conflict`                                   |
| Product quantity cannot be negative                     | Pydantic `ge=0` + `CHECK (quantity >= 0)`                                          |
| Orders cannot be placed if inventory is insufficient    | Per-line stock check → `400 Bad Request`                                           |
| Creating an order reduces available stock               | Stock decremented inside the same transaction, rows locked with `SELECT … FOR UPDATE` |
| Total order amount calculated by the backend            | Computed from `unit_price × quantity`; client total is ignored                    |
| Proper error handling & HTTP status codes               | `201/204/400/404/409/422` used throughout; global integrity-error handler         |
| Validate all request data                               | Pydantic schemas reject bad input with `422` before handlers run                  |
| Deleting an order restores stock                        | Quantities are added back on `DELETE /orders/{id}`                                 |

> Concurrency note: order creation locks product rows (`FOR UPDATE`) so two
> simultaneous orders cannot oversell the same item.

---

## Environment variables

See [`.env.example`](.env.example). Nothing sensitive is committed; the images
read all configuration from the environment.

| Variable              | Used by  | Description                                  |
| --------------------- | -------- | -------------------------------------------- |
| `POSTGRES_USER`       | db       | Database user                                |
| `POSTGRES_PASSWORD`   | db       | Database password                            |
| `POSTGRES_DB`         | db       | Database name                                |
| `DATABASE_URL`        | backend  | SQLAlchemy connection string                 |
| `CORS_ORIGINS`        | backend  | Allowed front-end origins (or `*`)           |
| `LOW_STOCK_THRESHOLD` | backend  | Stock level at/below which "low stock" fires |
| `VITE_API_URL`        | frontend | Backend base URL (baked in at build time)    |

---

## Deployment

### Backend → Render / Railway / Fly.io

The backend ships as a Docker image. A typical Render flow:

1. Push this repo to GitHub.
2. Create a **PostgreSQL** instance on the platform and copy its connection URL.
3. Create a **Web Service** from `./backend` (Docker) and set:
   - `DATABASE_URL` = the managed Postgres URL
   - `CORS_ORIGINS` = your deployed frontend URL
4. The container listens on `$PORT` automatically.

Build & push the backend image to Docker Hub:

```bash
docker build -t <your-dockerhub-user>/inventory-backend:latest ./backend
docker push <your-dockerhub-user>/inventory-backend:latest
```

### Frontend → Vercel / Netlify

1. Import the repo and set the project root to `frontend/`.
2. Build command `npm run build`, output directory `dist`.
3. Add env var `VITE_API_URL` = your deployed backend URL.

---

## Submission deliverables

- **GitHub repository:** https://github.com/Sitiaro/Inventory-Management-System
- **Backend Docker Hub image:** https://hub.docker.com/r/sitiaro/inventory-backend
- **Live frontend URL:** https://inventory-management-system-navy-delta.vercel.app
- **Live backend API URL:** https://inventory-management-system-fxw2.onrender.com
