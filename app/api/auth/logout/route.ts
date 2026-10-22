import { NextResponse } from 'next/server';
import { route } from '@/lib/api';
export async function POST(req:Request) { return route(req,async()=>{const response=NextResponse.json({success:true});response.cookies.set('token','',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/',maxAge:0});return response;}); }
