// POS tables have their own namespace, separate from existing storefront data.
export const schemaStatements = [
 `CREATE SCHEMA IF NOT EXISTS qb_pos`,
 `CREATE TABLE IF NOT EXISTS qb_pos.users (
 id text PRIMARY KEY, name text NOT NULL, email text NOT NULL UNIQUE, password text NOT NULL,
 is_verified boolean NOT NULL DEFAULT false, verification_token text, verification_expires timestamptz,
 preferences jsonb NOT NULL DEFAULT '{"lowStockNotifications":true,"newOrderNotification":true,"outOfStockNotification":true}',
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), CHECK(email=lower(email)))`,
 `CREATE TABLE IF NOT EXISTS qb_pos.products (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES qb_pos.users(id), name text NOT NULL,
 sku text NOT NULL DEFAULT '', description text NOT NULL DEFAULT '', category text NOT NULL DEFAULT '',
 quantity integer NOT NULL DEFAULT 0 CHECK(quantity>=0), reorder_level integer NOT NULL DEFAULT 0 CHECK(reorder_level>=0),
 cost_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(cost_price>=0), sell_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(sell_price>=0),
 unit text NOT NULL DEFAULT 'pcs', image text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE UNIQUE INDEX IF NOT EXISTS products_owner_sku ON qb_pos.products(owner_id,lower(sku)) WHERE sku<>''`,
 `CREATE INDEX IF NOT EXISTS products_owner_created ON qb_pos.products(owner_id,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS qb_pos.orders (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES qb_pos.users(id), order_number text NOT NULL UNIQUE,
 customer_name text NOT NULL, customer_email text NOT NULL, total_amount numeric(14,2) NOT NULL CHECK(total_amount>=0),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE INDEX IF NOT EXISTS orders_owner_created ON qb_pos.orders(owner_id,created_at DESC)`,
 `CREATE TABLE IF NOT EXISTS qb_pos.order_items (
 id text PRIMARY KEY, order_id text NOT NULL REFERENCES qb_pos.orders(id) ON DELETE CASCADE,
 product_id text REFERENCES qb_pos.products(id) ON DELETE SET NULL, product_key text NOT NULL,
 name text NOT NULL, image text NOT NULL DEFAULT '', quantity integer NOT NULL CHECK(quantity>0), price numeric(14,2) NOT NULL CHECK(price>=0))`,
 `CREATE INDEX IF NOT EXISTS order_items_order ON qb_pos.order_items(order_id)`,
 `CREATE TABLE IF NOT EXISTS qb_pos.businesses (
 owner_id text PRIMARY KEY REFERENCES qb_pos.users(id), business_name text NOT NULL DEFAULT 'Que Bros Perfumery',
 address text NOT NULL DEFAULT '', phone text NOT NULL DEFAULT '', email text NOT NULL DEFAULT '',
 currency text NOT NULL DEFAULT 'PHP', weight_unit text NOT NULL DEFAULT 'pcs', low_stock_threshold integer NOT NULL DEFAULT 5 CHECK(low_stock_threshold>=0))`,
 `CREATE TABLE IF NOT EXISTS qb_pos.notifications (
 id text PRIMARY KEY, owner_id text NOT NULL REFERENCES qb_pos.users(id), type text NOT NULL,
 title text NOT NULL, message text NOT NULL, read boolean NOT NULL DEFAULT false,
 metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now())`,
 `CREATE INDEX IF NOT EXISTS notifications_owner_created ON qb_pos.notifications(owner_id,created_at DESC)`,
];
