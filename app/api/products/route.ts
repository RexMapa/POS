import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json({products:await s.products(id)})); }
export async function POST(req:Request) { return withUser(req,async(s,id)=>NextResponse.json({product:await s.createProduct(id,await req.json())},{status:201})); }
