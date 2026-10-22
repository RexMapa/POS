import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { dbConnect } from './db/db';
import { Store } from './db/store';
import { getUserIdFromRequest } from './auth';
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
  if(code==='23505') return NextResponse.json({message:'An account with this email or a product with this SKU already exists.'},{status:409});
  console.error('POS request failed',{code:code || 'unknown'});
  return NextResponse.json({message:'The database request could not be completed. Check the Neon connection and try again.'},{status:503});
 }
}
export async function withUser(req:Request,work:(store:Store,id:string)=>Promise<NextResponse>) {
 return route(req,async()=>{
  const id=await getUserIdFromRequest(req);
  const store=new Store(await dbConnect());
  if(!(await store.user(id))) throw new AppError('Account not found. Please sign in again.',401);
  return work(store,id);
 });
}
export function boundedLimit(url:URL,fallback=10) {
 const value=Number(url.searchParams.get('limit')||fallback);
 if(!Number.isInteger(value)||value<1||value>100) throw new AppError('Limit must be between 1 and 100');
 return value;
}
