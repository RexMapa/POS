# Verification — Que Bros POS v2

- Production Next.js build, TypeScript and ESLint checks.
- 37 passing PostgreSQL/configuration tests, including three parent test groups.
- Browser checks of all 30 reference screens against a real local production server using the pg driver and an isolated embedded PostgreSQL server. No API mocking was used.

The browser check covered owner bootstrap/sign-in, creating a product through its form, creating a category through its form, receiving a purchase, stock adjustment, completing a POS checkout through its product grid/cart, invoice display, supplier and customer return records, saved settings after reload, all report pages, theme switching, mobile layouts and navigation, and staff authorization. Restricted staff were denied administrative changes and report endpoints; product costs were hidden from the cashier workspace.

PostgreSQL tests additionally cover owner isolation, catalog dependencies, partial product edits, duplicate SKU handling, stock validation, duplicate order lines, transaction rollback, one-time receiving, return quantity limits and approval, one-time cancellation/restocking, payment overrun rejection, cost snapshots, settings validation, staff password hashing/suspension, role edits and audit records.

Test data and passwords exist only in isolated local checks; no sample data is seeded into a deployed boutique. Preview images show test records. The live Neon database, GitHub repository, Vercel deployment, SMTP delivery and physical hardware were not accessed or tested.

See START-HERE.md for deployment, UPGRADE-TO-V2.md for existing installations and FEATURE-CHECKLIST.md for the full operational scope.
