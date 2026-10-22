import { NextResponse } from 'next/server';
import { compare, hash } from 'bcryptjs';
import { route } from '@/lib/api';
import { dbConnect } from '@/lib/db/db';
import { Store } from '@/lib/db/store';
import { signin } from '@/lib/validation';
import { AppError } from '@/lib/errors';
import { issueSession, setSessionCookie, sessionSecret } from '@/lib/session';
import { resolveActor } from '@/lib/suite/access';
const dummyHash=hash('invalid-credentials-timing-check',12);
export async function POST(req:Request) { return route(req,async()=>{
 sessionSecret();
 const body=signin.parse(await req.json());
 const store=new Store(await dbConnect());
 const user=await store.userByEmail(body.email);
 const matches=await compare(body.password,user?.password || await dummyHash);
 if(!user || !matches) throw new AppError('Invalid email or password',401);
 if(!user.is_verified) throw new AppError('Please verify your email before signing in.',403);
 await resolveActor(store.db,user.id);
 await store.db.query('UPDATE qb_pos.memberships SET last_login=now() WHERE user_id=$1',[user.id]);
 return setSessionCookie(NextResponse.json({message:'Welcome back',user:{id:user.id,name:user.name,email:user.email}}),await issueSession(user.id));
 }); }
