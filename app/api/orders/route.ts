import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json(await s.orders(id))); }
export async function POST(req:Request) { return withUser(req,async(s,id)=>NextResponse.json({order:await s.createOrder(id,await req.json())},{status:201})); }
