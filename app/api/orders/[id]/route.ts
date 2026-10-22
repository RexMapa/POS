import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

import { z } from 'zod';
import { AppError } from '@/lib/errors';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,c:Context) { return withUser(req,async(s,owner)=>{const order=(await s.orders(owner,(await c.params).id))[0]; if(!order) throw new AppError('Order not found',404); return NextResponse.json(order);}); }
export async function PATCH(req:Request,c:Context) { return withUser(req,async(s,owner)=>{const {status}=z.object({status:z.enum(['pending','completed','cancelled'])}).parse(await req.json()); return NextResponse.json({order:await s.updateOrder(owner,(await c.params).id,status)});}); }
