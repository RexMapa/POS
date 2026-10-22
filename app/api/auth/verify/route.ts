import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { dbConnect } from '@/lib/db/db';
import { issueSession, setSessionCookie, sessionSecret } from '@/lib/session';
export async function GET(req:NextRequest) {
 try {
  sessionSecret();
  const token=req.nextUrl.searchParams.get('token');
  if(!token || !/^[a-f0-9]{64}$/.test(token)) return NextResponse.redirect(new URL('/verification-failure?error=invalid',req.url));
  const db=await dbConnect();
  const user=await db.transaction(async tx=>{
   const [u]=await tx.query<{id:string}>('SELECT id FROM qb_pos.users WHERE verification_token=$1 AND verification_expires>now() FOR UPDATE',[createHash('sha256').update(token).digest('hex')]);
   if(!u) return null;
   await tx.query('UPDATE qb_pos.users SET is_verified=true,verification_token=null,verification_expires=null,updated_at=now() WHERE id=$1',[u.id]);
   return u;
  });
  if(!user) return NextResponse.redirect(new URL('/verification-failure?error=invalid',req.url));
  return setSessionCookie(NextResponse.redirect(new URL('/dashboard',req.url)),await issueSession(user.id));
 } catch { return NextResponse.redirect(new URL('/verification-failure?error=server',req.url)); }
}
