import { loadEnvConfig } from '@next/env';
import { dbConnect } from '../lib/db/db';
loadEnvConfig(process.cwd());
try { await dbConnect();console.log('Que Bros PostgreSQL tables are ready.');process.exit(0); }
catch { console.error('Database setup failed. Check DATABASE_URL and the Neon database role permissions.');process.exit(1); }
