import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

export async function PATCH(req:Request,c:{params:Promise<{id:string}>}) { return withUser(req,async(s,owner)=>{await s.markRead(owner,(await c.params).id);return NextResponse.json({success:true});}); }
