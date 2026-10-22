# Upload to GitHub → host on Vercel → store data in Neon

This is version 2 of the Que Bros PostgreSQL POS with all 30 reference sections. Keep all files and folders together at the root of the GitHub repository. If you already deployed the earlier version, use UPGRADE-TO-V2.md. FEATURE-CHECKLIST.md maps every reference screen to the new workspace.

## 1. Get your Neon connection string

Open your existing Neon project, choose the branch and database for the POS, and click **Connect**. Turn on **Connection pooling** and copy the PostgreSQL connection string. It normally contains `-pooler` in its hostname and `sslmode=require` in the query.

The POS creates its own `qb_pos` schema and tables when the first database request runs. Your Neon role needs permission to create this schema. You do not need to paste SQL manually. Existing tables in other schemas are left in place. A separate Neon database or branch for the POS is a good way to keep testing and live records apart.

## 2. Upload this project to GitHub

Create a repository (private is fine), choose **Add file → Upload files**, then upload the contents of this folder. The repository root should contain `package.json`, `package-lock.json`, `vercel.json`, `app/`, `components/`, and `lib/`. Include the `.github/` folder if you want automated checks.

Do not upload the ZIP itself, `node_modules`, `.next`, or a real `.env.local` file. The provided `.env.example` contains blanks and is safe to include.

## 3. Import the repository into Vercel

In Vercel select **Add New → Project**, choose the GitHub repository, and keep the **Next.js** framework preset. Choose Node.js **22.x**, or another supported version 20.9 or later. If you uploaded the folder itself, set Vercel's **Root Directory** to that folder; if you uploaded its contents, keep the root as `./`.

The supplied configuration uses `npm ci` for installation and `npm run build` for building. There is no static export step; the application needs server functions.

## 4. Add these four environment variables before deploying

| Name | Your value |
| --- | --- |
| `DATABASE_URL` | The full pooled Neon PostgreSQL connection string, including the password and SSL query parameters |
| `JWT_SECRET` | A unique, random secret at least 32 characters long. A password manager can generate one. |
| `ADMIN_EMAIL` | The email address you want to use to sign in |
| `ADMIN_PASSWORD` | A strong password containing 12–72 characters |

Set them for **Production**. For Preview deployments, use a separate Neon branch and set the corresponding Preview values if you want to test changes there. Database URLs and passwords belong in Vercel's settings, not in GitHub or a `NEXT_PUBLIC_` variable.

Deploy. If you change environment variables after deploying, **redeploy** so the new values take effect.

## 5. Sign in and check the setup

Open the Vercel URL, click **Enter your workspace**, and sign in with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`. The first database request creates the POS tables and the verified owner account automatically. Email delivery is not required for this account. The first request can take longer while Neon wakes and initializes the tables.

Add a test fragrance with stock, create a sale, mark it completed, and check the dashboard. Cancelling a sale restores its stock exactly once. Completed orders contribute to sales reports; pending and cancelled orders do not.

The default display currency is **PHP**. Change it under Settings → Business Details if needed. This changes the display currency only; existing prices are not converted at an exchange rate.

After the initial owner account is created, you may remove `ADMIN_PASSWORD` from Vercel and redeploy. The password is stored as a bcrypt hash in Neon. Changing `ADMIN_PASSWORD` later does **not** overwrite an existing account's password. Keep the database password separate from the POS login password.

## Optional email registration

Public registration is disabled by default. Add shared boutique staff under Users → All Users and assign a role under Roles & Permissions. Public self-registration, if enabled, creates an independent boutique owner rather than a staff account. To enable it, add `REGISTRATION_ENABLED=true`, `APP_URL=https://your-pos-domain`, and all `SMTP_*` and `EMAIL_FROM` settings from `.env.example`, then redeploy. Registration requires email verification; the owner and owner-created staff accounts do not.

## Common setup problems

- **Neon connection error:** confirm you copied the full PostgreSQL string into `DATABASE_URL`, including SSL settings, and redeploy. A MongoDB URI will not work here.
- **Schema permission error:** connect with a Neon database role that can create schemas and tables. For restricted runtime roles, initialize the schema separately with the SQL in `database/schema.sql` using an authorized role, then grant the app role access to `qb_pos` and its tables.
- **Sign-in error:** check that the four required variables are set in the same Vercel environment. Passwords are case sensitive. Existing owner passwords are preserved across redeploys.
- **Old design or old MongoDB error:** ensure Vercel imported this PostgreSQL version and is pointing to the correct repository root and branch.
- **Custom domain:** add it to Vercel, then set `APP_URL` to the new HTTPS origin if email registration is enabled.

## Local use and checks

Install Node.js 22, run `npm ci`, copy `.env.example` to `.env.local`, add your values, and run `npm run dev`. `npm run db:migrate` can initialize the schema and owner before opening the app. Builds do not require database credentials.

Commands: `npm run lint`, `npm test`, `npm run build`.

The repository tests use an isolated embedded PostgreSQL engine. They cover inventory, ownership checks, sales, stock rollback, cancellations, reports, settings, sessions and configuration. They never connect to your Neon account.

## Scope

This is an online inventory and order-management POS with purchasing, returns, invoices, CRM, expenses, staff permissions and reports. Payment terminal processing, cash-drawer hardware, offline sales and automatic synchronization with the storefront are not included. Existing MongoDB records are not imported automatically. No real credentials or production records are bundled. See FEATURE-CHECKLIST.md for details about warehouse labels, unit conversion metadata, catalog tax fields and optional integrations.

References: [Neon connection guide](https://neon.com/docs/guides/node), [Vercel environment settings](https://vercel.com/docs/environment-variables/managing-environment-variables), [Vercel connection pooling](https://vercel.com/kb/guide/connection-pooling-with-functions).
