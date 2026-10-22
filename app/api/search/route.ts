import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json(await s.search(id,(new URL(req.url).searchParams.get('q')||'').trim().slice(0,200)))); }
