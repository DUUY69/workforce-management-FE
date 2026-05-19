# Workforce Management — Frontend

React + Vite (port `5174`).

## Chạy local

```bash
cp .env.example .env
npm install
npm run dev
```

API mặc định: `http://localhost:5001` (cấu hình qua `VITE_API_BASE_URL`).

Backend: [workforce-management-BE](https://github.com/DUUY69/workforce-management-BE)

## Deploy (Vercel)

Xem [DEPLOY.md](./DEPLOY.md) — set `VITE_API_BASE_URL` = URL Render API (https, không `/api` cuối).
