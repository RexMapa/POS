import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { dbConnect } from '@/lib/db/db';
import { Store } from '@/lib/db/store';
import { SuiteService } from '@/lib/suite/service';
import { resolveActor } from '@/lib/suite/access';
import { sendEmail } from '@/lib/utils/send-email';
import { str,num } from '@/lib/suite/types';
export async function GET(req:Request){
 const secret=process.env.CRON_SECRET,auth=req.headers.get('authorization')||'';
 if(!secret)return NextResponse.json({skipped:true,reason:'Scheduled email is not configured'});
 if(Buffer.byteLength(auth)!==Buffer.byteLength('Bearer '+secret)||!timingSafeEqual(Buffer.from(auth),Buffer.from('Bearer '+secret)))return NextResponse.json({message:'Unauthorized'},{status:401});
 if(!process.env.SMTP_HOST||!process.env.SMTP_USER||!process.env.SMTP_PASS||!process.env.EMAIL_FROM)return NextResponse.json({skipped:true,reason:'Email delivery is not configured'});
 const db=await dbConnect(),owners=await db.query<{id:string}>('SELECT u.id FROM qb_pos.users u WHERE NOT EXISTS(SELECT 1 FROM qb_pos.memberships m WHERE m.user_id=u.id)');let sent=0;
 for(const owner of owners){
  const service=new SuiteService(db,await resolveActor(db,owner.id)),settings=await service.settings(),p=settings.notifications,email=str(p.email);
  if(!email||(!p.dailyDigest&&!p.lowStock&&!p.overdue))continue;
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Manila'}).format(new Date()),key=`${owner.id}-daily-${date}`;
  if((await db.query('SELECT id FROM qb_pos.records WHERE id=$1',[key])).length)continue;
  const store=new Store(db),stats=await store.stats(owner.id),products=await store.products(owner.id),low=products.filter(v=>v.quantity<v.reorderLevel),sales=await store.orders(owner.id),overdue=sales.filter(s=>s.status!=='cancelled'&&s.totalAmount>num(s.paid)&&str((s as Record<string,unknown>).dueDate)<date);
  const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
  await sendEmail({to:email,subject:`Que Bros Perfumery — Boutique summary ${date}`,html:`<h1>Que Bros Perfumery</h1><p>${escape(date)} · Boutique operations</p>${p.dailyDigest?`<p>Today’s completed sales: ${stats.todayOrders}<br/>Revenue: ${escape(str(settings.general.currency))} ${stats.todayRevenue.toFixed(2)}</p>`:''}${p.lowStock?`<h2>Low Stock</h2><ul>${low.map(v=>`<li>${escape(v.name)}: ${v.quantity} remaining</li>`).join('')||'<li>No low-stock items</li>'}</ul>`:''}${p.overdue?`<p>Outstanding overdue invoices: ${overdue.length}</p>`:''}`});
  await service.put('alert-log',key,{date,sent:true});sent++;
 }
 return NextResponse.json({sent});
}
