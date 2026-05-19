# Deploy — Vercel (FE) + Render (BE)

Xem repo BE: [workforce-management-BE/DEPLOY.md](https://github.com/DUUY69/workforce-management-BE/blob/main/DEPLOY.md)

## Frontend (repo này) trên Vercel

1. [Vercel](https://vercel.com) → **Add New** → **Project** → `workforce-management-FE`
2. **Framework:** Vite | **Build:** `npm run build` | **Output:** `dist`
3. **Environment:** `VITE_API_BASE_URL` = `https://<tên-service>.onrender.com` (https, không `/api` cuối)
4. **Redeploy** sau khi đổi env.

Backend: [workforce-management-BE](https://github.com/DUUY69/workforce-management-BE)
