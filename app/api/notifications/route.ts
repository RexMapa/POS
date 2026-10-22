import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { boundedLimit } from '@/lib/api';
export async function GET(req:Request) { return withUser(req,async(s,id)=>{const url=new URL(req.url);return NextResponse.json({notifications:await s.notifications(id,url.searchParams.get('unreadOnly')==='true',boundedLimit(url,20))});}); }
export async function DELETE(req:Request) { return withUser(req,async(s,id)=>{await s.db.query('DELETE FROM qb_pos.notifications WHERE owner_id=$1',[id]);return NextResponse.json({message:'All notifications cleared'});}); }
