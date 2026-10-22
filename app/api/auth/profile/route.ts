import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { z } from 'zod';
import { email } from '@/lib/validation';
export async function GET(req:Request) { return withUser(req,async(s,id)=>{const u=(await s.user(id))!;return NextResponse.json({user:{id:u.id,name:u.name,email:u.email}});}); }
export async function PATCH(req:Request) { return withUser(req,async(s,id)=>{const b=z.object({newUserName:z.string().trim().min(1).max(120),newUserEmail:email}).parse(await req.json());await s.db.query('UPDATE qb_pos.users SET name=$2,email=$3,updated_at=now() WHERE id=$1',[id,b.newUserName,b.newUserEmail]);return NextResponse.json({message:'Profile updated successfully'});}); }
