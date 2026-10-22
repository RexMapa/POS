# Verification

Completed checks for this package:

- Production Next.js build with no database credentials present.
- TypeScript and ESLint checks.
- 21 passing PostgreSQL/configuration tests, including the two parent test groups.
- A local production server connected through the real `pg` driver to an isolated embedded PostgreSQL server. No API mocking was used in this check.

The running-app check verified automatic schema creation and owner bootstrap, browser sign-in, saved product creation and partial edits, order creation from database prices, insufficient-stock rejection, order completion, cancellation and one-time stock restoration, sales/customer reports, dashboard numbers, PHP formatting, product and order detail navigation, mobile overflow, logout and protected-page redirects.

Unit/integration coverage also includes owner isolation, duplicate SKU checks, duplicate order-line handling, transaction rollback after a later write fails, search wildcard escaping, notification preferences, business settings, preserved order snapshots after a product is deleted, password hashing, tampered sessions and invalid configuration.

Your real Neon connection, GitHub repository, Vercel deployment and optional SMTP provider were not accessed. Set your own deployment environment values using START-HERE.md. Local test accounts and records are not included in this package.
