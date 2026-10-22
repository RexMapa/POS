# Que Bros Perfumery — reference screen coverage

All 30 supplied reference screens have matching sections in the Que Bros navigation. The interface uses the original Que Bros logos, warm cream, charcoal, golden yellow, serif headings, PHP by default, and Que Bros ownership throughout the header, invoices, receipts and footer. No Invenza sample customers or electronics products are seeded.

| Reference | Que Bros section and implemented controls |
| --- | --- |
| Dashboard | Welcome panel, month/year filters, export, sales/revenue/cost/profit, sales statistics, revenue breakdown, inventory/user/stock overview, customer statistics, purchase overview, recent sales and low-stock reorder links |
| Products | Table, product image and brand, SKU, category, stock status, quantity, purchase/selling prices, status, creation date, search, category/stock filters, sort, selection, pagination, CSV import/export, add/edit/delete |
| Add Product | Name, SKU, barcode, category, brand, unit, status, warehouse, prices, tax/discount catalog fields, opening/min/max stock, description, image upload/drop, save, save/add-new, cancel and profit preview |
| Categories | Totals, subcategories, categorized products, top category, name/code/slug/parent, product count, status, date, search, add/edit/delete and export |
| Brands | Total/active brands, branded products, top brand, brand cards, code, website, product count, status, add/edit/delete and search |
| Units | Name, symbol, base unit, multiplication/division ratio, assigned product count, status and add/edit |
| Stock Adjustment | Totals, added/subtracted stock, net value, reference/date/warehouse/product/type/quantity/value/reason/actor, filters, audit detail and export |
| Purchases | Totals, procurement spend, paid/due, supplier/order/payment filters, reference, supplier, date, warehouse, totals, status, edit/receive, payment recording and export |
| Add Purchase | Supplier, automatic reference, purchase/due/expected-delivery dates, destination, status, line items, costs, quantity, tax, discount, shipping, totals, payment status/amount/method, notes and save |
| Purchase Returns | Return/refund/pending/completed totals, source purchase, supplier, quantities, reason, status, view, create, approval/rejection and export |
| Sales | Sales/revenue/profit/unpaid totals, invoice/customer/date/total/paid/balance/method/status, filters, search, print/view, payment, cancellation and export |
| Point of Sale | Barcode/SKU/name lookup, category filter, product grid, stock counts, walk-in/customer selection, add customer, cart/quantity/remove/clear, tax/discount, payable total, payment methods, tender shortcuts, cash/change, manager discount authorization, checkout and receipt |
| Sales Returns | Return/refund/restocked/pending totals, original sale, customer, quantities, refund, reason, status, view and manager approval/rejection |
| Invoices | Invoiced/collected/pending/overdue totals, invoice/customer/dates/total/paid/balance/status, filters, view, create through POS, payment, print/save PDF and email with SMTP |
| Customers | Contact details, phone/address/company/tier, active status, sales counts, spend/balance, add/edit/detail/search/filter/export |
| Suppliers | Contact person, email/phone/address/category/tax ID, terms, procurement count/spend/payables, active status, add/edit/detail/search/filter/export |
| Expenses | Total/rent/salary/petty-cash cards, category breakdown, monthly trend, reference/title/payee/category/date/amount/method/paid-by/status, add/edit/view/delete/filter/export |
| Sales Report | Date ranges, daily/weekly/year view, gross revenue/orders/average/discounts, margin chart, payment-method breakdown, product sales/margins, CSV and print/PDF |
| Purchase Report | Procurement/average/returns/suppliers, monthly expenditure, supplier spend share, supplier order/spend/paid/due/fulfillment, CSV and print/PDF |
| Inventory Report | Cost/retail valuation, low/out-of-stock, category valuation, stock health, SKU/category/quantity/minimum/cost/valuation, reorder navigation, CSV and print/PDF |
| Profit & Loss | Date/quarter/year controls, revenue/COGS/gross/net profit, monthly profit chart, income statement, returns/discounts, expense categories, CSV and print/PDF |
| Customer Report | Registered/repeat/spend/retention, monthly customer activity, tiers, lifetime value/orders/average/last-order, directory link, CSV and print/PDF |
| Supplier Report | On-time rate, quality acceptance, lead time, open purchases, delivery/fulfillment comparisons and supplier scorecard derived from receiving/return records |
| Users | Shared boutique team accounts, roles, assigned warehouse, active/suspended status, last login, add/edit/password changes and staff export |
| Roles | Administrator/manager/cashier/inventory-clerk cards, assigned counts and server-enforced read/create/update/delete matrix with select/deselect/save |
| General Settings | Company logo/name/tax/email/phone/address, PHP and other currencies, symbol position, timezone/date format and save |
| Inventory Settings | Default stock threshold, blocked overselling, default warehouse/unit, SKU prefix, barcode format preference and scanner beep |
| Sales Settings | Tax, invoice terms/prefix, cashier discount threshold, owner authorization, receipt header/footer and enabled tender methods |
| Purchase Settings | PO/return prefixes, supplier terms, approval threshold, automatic receiving and barcode verification |
| Notification Settings | Low-stock/daily/overdue/inbound preferences, recipient email, supervisor contact, SMTP test alert, in-app notifications and optional daily Vercel email job |

## Operational notes

- Quantities are tracked per product in that product’s assigned unit. Unit conversion ratios are catalog metadata; mixed-unit selling and warehouse-to-warehouse transfer accounting are not included.
- Assigned warehouse labels route staff and transactions; the permission matrix controls business-module access. This release does not implement separate per-warehouse stock balances or branch-level data segregation.
- Tender methods record cash, external card/bank payments or externally managed store credit. They do not charge a card, transfer money or maintain a gift-card wallet.
- Open Drawer records an audit event. Opening a physical drawer requires compatible printer/hardware integration.
- Receipts and reports use the browser’s print / Save as PDF. Email invoices/test alerts and daily summaries require SMTP. SMS phone numbers are saved contacts; no SMS gateway is bundled.
- Daily email jobs require CRON_SECRET and SMTP settings. They send the boutique owner’s summary; automated emails directly to overdue customers are not enabled.
- Catalog tax and discount fields are stored for reference; POS checkout uses its displayed order tax/discount controls. Maximum stock is a catalog planning field. Barcode lookup accepts the value stored on the product; this edition does not generate barcode artwork.
- Supplier fulfillment and quality indicators are calculated from received purchase dates, expected delivery dates and returned units; they are operational indicators rather than a dedicated delivery SLA system.
- Retention is displayed as repeat purchasing within the selected period. No external analytics provider is required.
