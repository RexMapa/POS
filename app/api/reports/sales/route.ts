import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { reportDates } from '@/lib/validation';

export async function GET(req:Request) { return withUser(req,async(s,id)=>{const url=new URL(req.url);const {start,end}=reportDates(url);return NextResponse.json(await s.salesReport(id,start,end));}); }
