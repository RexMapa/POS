import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { email } from '@/lib/validation';
import { sendVerification, requireRegistration } from '@/lib/registration';
export async function POST(req:Request) { return route(req,async()=>{
 requireRegistration();
 await sendVerification(email.parse((await req.json()).email));
 return NextResponse.json({message:'Verification email resent'});
}); }
