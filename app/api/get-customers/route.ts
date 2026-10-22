import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json(await s.customers(id))); }
