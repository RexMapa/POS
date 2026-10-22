import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { dbConnect } from './db/db';
import { Store } from './db/store';
import { getUserIdFromRequest } from './auth';
import { resolveActor,authorize } from './suite/access';
export async function route(req:Request,work:()=>Promise<NextResponse>) {
 try {
  if(!['GET','HEAD','OPTIONS'].includes(req.method)) {
   const origin=req.headers.get('origin');
   if(origin && origin!==new URL(req.url).origin) throw new AppError('Request origin is not allowed',403);
  }
  const result=await work();
  result.headers.set('Cache-Control','private, no-store'); return result;
 } catch(error) {
  if(error instanceof AppError) return NextResponse.json({message:error.message},{status:error.status});
  if(error instanceof ZodError) return NextResponse.json({message:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')},{status:400});
  if(error instanceof SyntaxError) return NextResponse.json({message:'Invalid request body'},{status:400});
  const code=(error as {code?:string})?.code;
  if(code==='23505') return NextResponse.json({message:'A record with this email, SKU, catalog name or unit symbol already exists.'},{status:409});
  const message=error instanceof Error?error.message.replace(/postgres(?:ql)?:\/\/\S+/gi,'[redacted connection]').slice(0,240):'Unknown error';
  console.error('POS request failed',{code:code || 'unknown',message});
  if(code==='28P01')return NextResponse.json({message:'Neon rejected the database credentials. Copy a fresh connection string into Vercel DATABASE_URL and redeploy.'},{status:503});
  if(code==='42501')return NextResponse.json({message:'The Neon database role lacks permission to initialize the POS tables. Run database/schema.sql with your Neon owner role or use an authorized connection.'},{status:503});
  return NextResponse.json({message:'The database request could not be completed. Check the Neon connection and try again.'},{status:503});
 }
}
export async function withUser(req:Request,work:(store:Store,id:string)=>Promise<NextResponse>) {
 return route(req,async()=>{
  const id=await getUserIdFromRequest(req);
  const store=new Store(await dbConnect());
  const actor=await resolveActor(store.db,id);
  store.actorId=id;
  store.hideCosts=!actor.isOwner&&!actor.permissions.inventory?.includes('read')&&!actor.permissions.reports?.includes('read');
  const path=new URL(req.url).pathname;
  const self=path.includes('/auth/profile')||path.includes('/user/preferences');
  const action=req.method==='GET'?'read':req.method==='POST'?'create':req.method==='DELETE'?'delete':'update';
  if(!self&&!path.includes('/notifications')) {
   const scope=path.includes('/reports')?'reports':path.includes('/settings')?'admin':path.includes('/products')||path.includes('/search')?'inventory':path.includes('/get-customers')?'customers':'sales';
   if(!(req.method==='GET'&&path.includes('/settings/business'))) authorize(actor,scope,action);
  }
  return work(store,self?id:actor.owner);
 });
}
export function boundedLimit(url:URL,fallback=10) {
 const value=Number(url.searchParams.get('limit')||fallback);
 if(!Number.isInteger(value)||value<1||value>100) throw new AppError('Limit must be between 1 and 100');
 return value;
}
