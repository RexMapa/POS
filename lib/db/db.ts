import { Pool, type PoolClient } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import { hash } from "bcryptjs";
import { randomUUID } from "node:crypto";
import { schemaStatements } from "./schema";
import { AppError } from "../errors";

export interface Database {
 query<T = Record<string, unknown>>(text: string, values?: unknown[]): Promise<T[]>;
 transaction<T>(work: (tx: Database) => Promise<T>): Promise<T>;
}
export function databaseUrl() {
 const value = (process.env.DATABASE_URL || process.env.POSTGRES_URL)?.trim();
 if (!value) throw new AppError("Add your Neon DATABASE_URL in Vercel Environment Variables, then redeploy.", 503);
 let url: URL;
 try { url = new URL(value); } catch { throw new AppError("DATABASE_URL must be a PostgreSQL connection string.", 503); }
 if (!["postgres:", "postgresql:"].includes(url.protocol)) throw new AppError("DATABASE_URL must start with postgres:// or postgresql://.", 503);
 if (!url.hostname || !url.username || !url.pathname.slice(1)) throw new AppError("DATABASE_URL is incomplete.", 503);
 if (!['localhost','127.0.0.1','::1'].includes(url.hostname) && !['require','verify-full','verify-ca'].includes(url.searchParams.get('sslmode') || '')) throw new AppError("Use the Neon connection string with sslmode=require.", 503);
 return value;
}
function adapter(pool: Pool, client?: PoolClient): Database {
 return {
  async query<T>(text: string, values: unknown[] = []) { return (await (client || pool).query(text, values)).rows as T[]; },
  async transaction<T>(work: (tx: Database) => Promise<T>) {
   if (client) return work(adapter(pool, client));
   const connection = await pool.connect();
   try {
    await connection.query("BEGIN");
    const result = await work(adapter(pool, connection));
    await connection.query("COMMIT"); return result;
   } catch (error) { await connection.query("ROLLBACK"); throw error; }
   finally { connection.release(); }
  },
 };
}
export async function bootstrapOwner(db: Database) {
 const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
 const password = process.env.ADMIN_PASSWORD;
 if (!email || !password) return;
 if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 12 || password.length > 72) throw new AppError("ADMIN_EMAIL must be valid and ADMIN_PASSWORD must contain 12–72 characters.", 503);
 const existing = await db.query("SELECT id FROM qb_pos.users WHERE email=$1", [email]);
 if (existing.length) return; // Existing passwords are never overwritten by bootstrap.
 await db.query("INSERT INTO qb_pos.users(id,name,email,password,is_verified) VALUES($1,$2,$3,$4,true) ON CONFLICT(email) DO NOTHING", [randomUUID(), 'Boutique Owner', email, await hash(password,12)]);
}
type Cached = { pool?: Pool; ready?: Promise<Database> };
const globalCache = globalThis as typeof globalThis & { qbPosDatabase?: Cached };
const cached = globalCache.qbPosDatabase ??= {};
export async function dbConnect(): Promise<Database> {
 const connectionString = databaseUrl();
 if (!cached.pool) {
  cached.pool = new Pool({ connectionString, max:3, idleTimeoutMillis:5000, connectionTimeoutMillis:15000 });
  cached.pool.on("error", () => console.error("Idle PostgreSQL connection closed; the pool will reconnect."));
  if (process.env.VERCEL) attachDatabasePool(cached.pool);
 }
 if (!cached.ready) {
  const db = adapter(cached.pool);
  cached.ready = (async () => {
   await db.transaction(async tx => {
    await tx.query("SELECT pg_advisory_xact_lock(717823140)");
    for (const statement of schemaStatements) await tx.query(statement);
   });
   await bootstrapOwner(db); return db;
  })().catch(error => { cached.ready = undefined; throw error; });
 }
 return cached.ready;
}
