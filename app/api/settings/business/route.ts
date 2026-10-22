import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json(await s.business(id))); }
export async function PATCH(req:Request) { return withUser(req,async(s,id)=>NextResponse.json({success:true,message:'Business settings saved',data:await s.saveBusiness(id,await req.json())})); }
