import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
export async function middleware(req:NextRequest) {
 const token=req.cookies.get('token')?.value;
 const secret=process.env.JWT_SECRET?.trim();
 let valid=false;
 if(token && secret && secret.length>=32) {
  try { const {payload}=await jwtVerify(token,new TextEncoder().encode(secret),{algorithms:['HS256'],issuer:'que-bros-pos',audience:'que-bros-workspace'}); valid=typeof payload.id==='string' && !!payload.id; } catch {}
 }
 if(req.nextUrl.pathname.startsWith('/dashboard') && !valid) return NextResponse.redirect(new URL('/auth/signin',req.url));
 if(req.nextUrl.pathname==='/' && valid) return NextResponse.redirect(new URL('/dashboard',req.url));
 return NextResponse.next();
}
export const config={matcher:['/','/dashboard/:path*']};
