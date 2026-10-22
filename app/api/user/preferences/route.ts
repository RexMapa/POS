import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { preferencesInput } from '@/lib/validation';
export async function GET(req:Request) { return withUser(req,async(s,id)=>NextResponse.json({preferences:(await s.user(id))!.preferences})); }
export async function PATCH(req:Request) { return withUser(req,async(s,id)=>{const preferences=preferencesInput.parse((await req.json()).preferences);await s.db.query('UPDATE qb_pos.users SET preferences=$2::jsonb,updated_at=now() WHERE id=$1',[id,JSON.stringify(preferences)]);return NextResponse.json({preferences});}); }
