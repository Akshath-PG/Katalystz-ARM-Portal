# Katalystz

Welcome to the **Katalystz** repository! This repository contains both the Katalystz Edu Group landing page and the new **Katalystz ARM Portal**.

## 🚀 Katalystz ARM Portal

The **Katalystz ARM Portal** is a modern web application built for monitoring, tracking actions, and managing data via a centralized dashboard.

### 🛠️ Tech Stack
- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Frontend Library:** [React](https://reactjs.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Database & ORM:** [Prisma](https://www.prisma.io/) (with SQLite for development)
- **Authentication:** [NextAuth.js](https://next-auth.js.org/) (Credentials Provider)
- **Data Visualization:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)

### 📂 Portal Structure
The primary application code for the portal is located in the `frontend` directory:
- **`frontend/src/app`**: Next.js App Router pages and API routes (including authentication endpoints).
- **`frontend/src/components`**: Reusable React components including UI elements, War Room widgets, and charts.
- **`frontend/prisma`**: Prisma schema and database configuration, as well as the database seed script.

### ⚙️ Getting Started (Portal)

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Environment Configuration:**
   Create a `.env` file in the `frontend` directory:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_SECRET="your-secret-key-here"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. **Database Setup:**
   ```bash
   npx prisma generate
   npx prisma db push
   npx prisma db seed
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   The portal will be running at [http://localhost:3000](http://localhost:3000).

### ☁️ Deploying (Vercel + Neon, free tiers)

1. **Import the repo in Vercel** ([vercel.com/new](https://vercel.com/new)) and set **Root Directory** to `frontend`.
2. **Add the database:** in the Vercel project, open **Storage → Create/Connect → Neon** and connect it to the project. This sets `DATABASE_URL` and `DATABASE_URL_UNPOOLED` automatically.
3. **Add environment variables** under **Settings → Environment Variables**:
   - `NEXTAUTH_SECRET`: a long random string (e.g. `openssl rand -base64 32`)
   - `NEXTAUTH_URL`: the site URL, e.g. `https://<project>.vercel.app`
4. **Deploy.** The `vercel-build` script runs `prisma db push` and `prisma db seed`, so the tables and the first admin are created automatically (the admin is only created if it doesn't exist yet).
5. **Log in** as `admin@katalystzedu.com` / `Password123!` and change the password right away. To use your own admin login instead, set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in Vercel before the first deploy.
6. Add data in the portal: **Manage Schools** → add a school → open it to add classes, subjects and students. Create staff accounts under **Admin Users**.

---

## 🌐 Katalystz Edu Group (Landing Page)

A modern, highly interactive, consulting-style landing page for **Katalystz Edu Group**—a strategic transformation partner dedicated to building ecosystems of excellence in schools.

### 🚀 Features
*   **Premium Glassmorphism Aesthetic**: Sleek, frosted-glass design elements that give a high-end, boardroom-ready appearance.
*   **Bidirectional Scroll Animations**: Fluid motion effects that reveal and hide content smoothly whether scrolling up or down.
*   **Fully Responsive**: Adapts perfectly to desktop, tablet, and mobile viewing environments.
*   **No Build Tools Required**: Built purely with Vanilla web technologies for instant, zero-setup deployment.

### 💻 How to Run (Landing Page)
Because this portion of the project is built with Vanilla web technologies, it requires no installation.
1. Navigate to the root directory.
2. Double-click the `index.html` file to open it in your default web browser!

---
*Built for transforming schools from Operational → Strategic → Future-ready.*
