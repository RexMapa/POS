import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { reportDates } from '@/lib/validation';
import { boundedLimit } from '@/lib/api';
export async function GET(req:Request) { return withUser(req,async(s,id)=>{const url=new URL(req.url);const {start,end}=reportDates(url);return NextResponse.json(await s.customerReport(id,start,end,url.searchParams.get('sortBy')||'revenue',boundedLimit(url)));}); }
