# Upgrade the existing Que Bros POS to the complete workspace

1. Back up your Neon database/branch before updating a live boutique.
2. Replace the repository's project files with the contents of this new ZIP. Keep the same GitHub repository and Vercel project.
3. Keep your existing Vercel `DATABASE_URL` and `JWT_SECRET`. Keep your existing owner login. New installs also need `ADMIN_EMAIL` and `ADMIN_PASSWORD` for automatic owner creation.
4. Deploy. On the first authenticated request the app adds the new columns and tables using idempotent SQL. It does not drop the existing users, products or orders.
5. If your database role cannot create schemas/tables, run the supplied `database/schema.sql` in Neon's SQL Editor using your authorized Neon owner role, then use an app role with access to the `qb_pos` schema. Error messages now distinguish invalid credentials and insufficient permissions.
6. Open `/dashboard`, review General/Inventory/Sales/Purchase Settings, then add categories, perfume houses, units, suppliers and customers. Add staff through Users → All Users; they share your boutique's records according to their roles.

Existing product/order links redirect to the new inventory and invoice screens. Existing owner credentials are preserved; `ADMIN_PASSWORD` never overwrites an existing password. Do not remove your database environment settings when updating source files.

## New optional services

- For invoice emails and test alerts, add SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS and EMAIL_FROM in Vercel.
- For daily boutique summaries, set a separate random CRON_SECRET in Vercel, add the alert recipient email in Notification Preferences, and enable the summaries you need. The included Vercel cron runs daily at 8:00 AM Asia/Manila. Without a cron secret or SMTP, it skips email work.
- Print / Save as PDF works through the browser. A real card terminal, cash drawer and SMS provider require separate hardware/service integration. Recording a payment does not charge a card or send money.

## Historical data

Earlier releases did not capture every sale's cost-of-goods snapshot. Those historical costs cannot be reconstructed accurately from current product prices; profitability before the upgrade may be incomplete. New POS sales capture unit costs, taxes, discounts and payment details at checkout. Changing the display currency does not convert historical values.

The default inventory remains one quantity balance per product. Warehouse labels are retained on products, purchases, adjustments and staff assignments. Separate per-branch stock balances and branch-level data isolation are not part of this release.

See FEATURE-CHECKLIST.md for all 30 screens and the operational scope. No test products, test staff credentials or preview records are seeded into your Neon database.
