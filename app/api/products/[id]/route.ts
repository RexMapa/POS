import { NextResponse } from 'next/server';
import { withUser } from '@/lib/api';

type Context={params:Promise<{id:string}>};
export async function GET(req:Request,c:Context) { return withUser(req,async(s,owner)=>NextResponse.json({product:await s.product(owner,(await c.params).id)})); }
export async function PATCH(req:Request,c:Context) { return withUser(req,async(s,owner)=>NextResponse.json({product:await s.updateProduct(owner,(await c.params).id,await req.json())})); }
export async function DELETE(req:Request,c:Context) { return withUser(req,async(s,owner)=>{await s.deleteProduct(owner,(await c.params).id); return NextResponse.json({success:true});}); }
