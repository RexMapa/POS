# Que Bros Perfumery — Neon POS

A complete Next.js inventory and sales workspace designed for GitHub, Vercel hosting and Neon PostgreSQL. Start with [START-HERE.md](START-HERE.md).

- Cream, charcoal and gold Que Bros visual identity.
- Products, images, stock, sales/orders, customers and reports.
- PostgreSQL transactions prevent partial sales and negative stock.
- Cancelling an order restores stock once; cancelled orders cannot be reopened.
- PHP currency by default, with display currency controlled in Business Settings.
- Automatic first-run table and owner-account creation.
- No MongoDB connection or Mongoose dependency.
- Optional email registration; the owner can sign in without email setup.

Required Vercel environment variables: `DATABASE_URL`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.

```sh
npm ci
npm run dev
```

Copy `.env.example` to `.env.local` for local use and enter your own values. `npm run lint`, `npm test`, and `npm run build` run the project checks. The SQL schema is also included in `database/schema.sql`.

The optional `.github/workflows/checks.yml` checks pushes and pull requests. Import the GitHub repository into Vercel for automatic deployments.

Original inventory project: Invenza by Ahnaf Farhan Hossain. This edition replaces the MongoDB backend with PostgreSQL and retains the Que Bros boutique design.
