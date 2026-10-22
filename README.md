# Que Bros Perfumery · Boutique POS

A Que Bros redesign of the supplied Invenza inventory and order management application.

Start with [QUE-BROS-SETUP.md](QUE-BROS-SETUP.md) for local and Vercel setup, environment variables and the MongoDB build fix.

## Checks
- `npm run build` — production build (does not require MongoDB credentials).
- `npm run lint` — source checks.
- `npm run test:configuration` — database configuration regression checks.
- `npx tsc --noEmit` — type checks.

Desktop and mobile browser checks covered welcome/sign-in screens, invalid-email feedback, dashboard navigation, mobile menu, no page overflow, failed dashboard requests and retry. Dashboard previews use sample data. Live database reads/writes, verification email delivery and hosting deployment require your own service configuration and have not been tested here.

Next.js and its ESLint configuration were updated to 15.5.28, the patched 15.x release described at https://nextjs.org/blog/nextjs-security-update-october-14-2026 .

Original project: Invenza by Ahnaf Farhan Hossain. This update preserves its inventory, order, customer and report workflows. It does not add a payment terminal or connect the POS to the website's database automatically.
