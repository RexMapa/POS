import { randomBytes, createHash, randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import { dbConnect } from './db/db';
import { Store } from './db/store';
import { AppError } from './errors';
import { sendEmail } from './utils/send-email';
import { getVerificationEmailTemplate } from './utils/email-templates';
export function registrationEnabled() { return process.env.REGISTRATION_ENABLED==='true'; }
export function requireRegistration() {
 if(!registrationEnabled()) throw new AppError('Account registration is disabled. Sign in with your boutique owner account.',403);
 if(!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) throw new AppError('Email delivery is not configured. Ask the boutique owner to add the SMTP settings.',503);
}
export function appUrl() {
 const value=process.env.APP_URL || process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:'http://localhost:3000');
 const url=new URL(value);
 if(process.env.NODE_ENV==='production' && url.protocol!=='https:') throw new AppError('Set APP_URL to your deployed HTTPS address.',503);
 return url.origin;
}
export async function sendVerification(email:string,name?:string,password?:string) {
 requireRegistration();
 const store=new Store(await dbConnect());
 const user=await store.userByEmail(email);
 if(user?.is_verified) throw new AppError('An account with this email already exists. Please sign in.',409);
 const token=randomBytes(32).toString('hex');
 const digest=createHash('sha256').update(token).digest('hex');
 const expires=new Date(Date.now()+3600000);
 if(user) await store.db.query('UPDATE qb_pos.users SET verification_token=$2,verification_expires=$3 WHERE id=$1',[user.id,digest,expires]);
 else {
  if(!name || !password) throw new AppError('Account not found',404);
  await store.db.query('INSERT INTO qb_pos.users(id,name,email,password,verification_token,verification_expires) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),name,email,await hash(password,12),digest,expires]);
 }
 const link=`${appUrl()}/api/auth/verify?token=${token}`;
 const displayName=(user?.name || name || 'Boutique team').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
 await sendEmail({to:email,subject:'Verify your Que Bros workspace account',html:getVerificationEmailTemplate(displayName,link)});
}
