import { SignJWT, jwtVerify } from 'jose';
import { NextResponse } from 'next/server';
import { AppError } from './errors';
export const SESSION_ISSUER='que-bros-pos';
export const SESSION_AUDIENCE='que-bros-workspace';
export function sessionSecret() {
 const value=process.env.JWT_SECRET?.trim();
 if(!value || value.length<32) throw new AppError('Set JWT_SECRET to a random value of at least 32 characters in Vercel, then redeploy.',503);
 return new TextEncoder().encode(value);
}
export async function issueSession(id:string) {
 return new SignJWT({id}).setProtectedHeader({alg:'HS256'}).setIssuer(SESSION_ISSUER).setAudience(SESSION_AUDIENCE).setIssuedAt().setExpirationTime('7d').sign(sessionSecret());
}
export async function readSession(token:string) {
 const {payload}=await jwtVerify(token,sessionSecret(),{algorithms:['HS256'],issuer:SESSION_ISSUER,audience:SESSION_AUDIENCE});
 if(typeof payload.id!=='string' || !payload.id) throw new AppError('Authentication required',401);
 return payload.id;
}
export function setSessionCookie(response:NextResponse,token:string) {
 response.cookies.set('token',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:7*86400});
 return response;
}
