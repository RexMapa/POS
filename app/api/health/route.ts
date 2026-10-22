import { NextResponse } from 'next/server';
export async function GET() { return NextResponse.json({status:'ok',application:'Que Bros Perfumery POS',database:'postgresql'},{headers:{'Cache-Control':'no-store'}}); }
