import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
import { signup } from '@/lib/validation';
import { sendVerification, requireRegistration } from '@/lib/registration';
export async function POST(req:Request) { return route(req,async()=>{
 requireRegistration();
 const {name,email,password}=signup.parse(await req.json());
 await sendVerification(email,name,password);
 return NextResponse.json({message:'Verification email sent'},{status:201});
}); }
