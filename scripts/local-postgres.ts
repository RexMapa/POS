// Development/testing only. Production always uses DATABASE_URL and the pg driver.
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';
const db=await PGlite.create();
const port=Number(process.env.LOCAL_POSTGRES_PORT||55432);
const server=new PGLiteSocketServer({db,host:'127.0.0.1',port,maxConnections:10});
await server.start();
console.log(`Local PostgreSQL test server ready on 127.0.0.1:${port}`);
async function close(){await server.stop();await db.close();process.exit(0);}
process.on('SIGINT',close);process.on('SIGTERM',close);
