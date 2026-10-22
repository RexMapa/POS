# Que Bros Perfumery POS

This project retains the original inventory, order, customer, report and authentication flows with a Que Bros cream, charcoal and gold visual identity.

## Local use
1. Install Node.js 20 or newer and run `npm ci` in this folder.
2. Copy `.env.example` to `.env.local`.
3. Set `MONGODB_URI` to your real MongoDB connection string. For Atlas, create a database user and allow the application's server network access. URL-encode special characters in the database password.
4. Set `JWT_SECRET` to a long random secret. Set all SMTP fields and EMAIL_FROM to use registration verification emails.
5. Run `npm run dev` and open http://localhost:3000.

## Hosting / Vercel
Upload this entire project. Add MONGODB_URI, JWT_SECRET, NEXT_PUBLIC_BASE_URL (your deployed HTTPS URL), and SMTP/email variables in the project's Environment Variables settings. Enable them for the environments you deploy to, then redeploy. Never put database credentials in NEXT_PUBLIC variables.

## The reported build error
The original database module threw an error at import time when MONGODB_URI was absent. Next.js imports route files during its build, so it could not collect route data. The connection function now validates configuration only when the database is used, caches connections and resets failed attempts. Connection strings are no longer logged. Building does not require database credentials; authentication and live data still require a working database at runtime. No credentials are included in this package.

## Visual changes
Original Que Bros logos, warm cream surfaces, charcoal actions, golden accents, serif headings, simplified pill buttons, new welcome and sign-in screens, updated dashboard header and accessible error/retry handling. Existing API endpoints and stored records are preserved. This is an inventory and order workspace; payment terminal integration is not added.
