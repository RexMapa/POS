import { NextResponse } from 'next/server';
import { z } from 'zod';
import { route } from '@/lib/api';
import { dbConnect } from '@/lib/db/db';
import { getUserIdFromRequest } from '@/lib/auth';
import { Store } from '@/lib/db/store';
import { SuiteService } from '@/lib/suite/service';
import { resolveActor,authorize } from '@/lib/suite/access';
import { AppError } from '@/lib/errors';
import { sendEmail } from '@/lib/utils/send-email';
import { str,num } from '@/lib/suite/types';
type Context={params:Promise<{resource:string[]}>};
const escape=(v:unknown)=>str(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
async function handle(req:Request,context:Context){return route(req,async()=>{
 const userId=await getUserIdFromRequest(req),db=await dbConnect(),actor=await resolveActor(db,userId),s=new SuiteService(db,actor);
 const [kind,id]= (await context.params).resource;
 if(req.method==='GET'){if(kind==='state')return NextResponse.json(await s.state());throw new AppError('Unknown resource',404);}
 const body=req.method==='DELETE'?{}:await req.json();
 if(kind==='import'){
  authorize(actor,'inventory','create');const rows=z.array(z.record(z.string(),z.unknown())).min(1).max(1000).parse(body.products);
  await db.transaction(async tx=>{const store=new Store(tx);for(const [index,row] of rows.entries()){try{const clean={...row};for(const key of ['quantity','reorderLevel','costPrice','sellPrice','tax','discount','maximumStock'])if(clean[key]==='')delete clean[key];await store.createProduct(actor.owner,clean);}catch{throw new AppError(`Import failed on row ${index+2}. Check required names, numeric values and duplicate SKUs. No rows were imported.`);}}await new SuiteService(tx,actor).audit('import','products',{count:rows.length});});return NextResponse.json({success:true,count:rows.length});
 }
 if(kind==='products'){
  authorize(actor,'inventory',req.method==='DELETE'?'delete':id?'update':'create');
  const result=await db.transaction(async tx=>{const store=new Store(tx);if(req.method==='DELETE'){await store.deleteProduct(actor.owner,id);return {success:true};}const settings=await new SuiteService(tx,actor).settings();const defaults=id?{}:{reorderLevel:num(settings.inventory.lowStockThreshold),unit:str(settings.inventory.unit),warehouse:str(settings.inventory.warehouse),sku:str(settings.inventory.skuPrefix)+crypto.randomUUID().slice(0,8).toUpperCase()};const data={...defaults,...body};if(!id&&!data.sku)data.sku=defaults.sku;const product=id?await store.updateProduct(actor.owner,id,data):await store.createProduct(actor.owner,data);await new SuiteService(tx,actor).audit(id?'update':'create','products',{id:product._id});return product;});return NextResponse.json(result);
 }
 if(kind==='settings')return NextResponse.json(await s.saveSettings(id,body));
 if(kind==='adjustments')return NextResponse.json(await s.adjustment(body));
 if(kind==='purchases'&&id&&body.action==='payment'){
  authorize(actor,'purchases','update');const amount=z.coerce.number().positive().parse(body.amount);
  const result=await db.transaction(async tx=>{const t=new SuiteService(tx,actor),old=await t.find('purchases',id,true);if(old.data.status==='cancelled')throw new AppError('Cancelled purchases cannot be paid');const paid=num(old.data.paid)+amount;if(paid>num(old.data.total))throw new AppError('Payment exceeds purchase balance');return t.put('purchases',id,{...old.data,paid,balance:Math.round((num(old.data.total)-paid)*100)/100});});return NextResponse.json(result);
 }
 if(kind==='purchases')return NextResponse.json(await s.purchase(body,id));
 if(kind==='sales'&&!id)return NextResponse.json(await s.sale(body));
 if(kind==='sales'&&id){authorize(actor,'sales','update');const status=z.enum(['pending','completed','cancelled']).parse(body.status);return NextResponse.json(await new Store(db).updateOrder(actor.owner,id,status));}
 if(kind==='sales-returns'||kind==='purchase-returns')return NextResponse.json(await s.returnItems(kind,body,id));
 if(kind==='payments')return NextResponse.json(await s.payment(id,body));
 if(kind==='members')return NextResponse.json(await s.saveMember(body,id));
 if(kind==='roles'){await s.saveRole(id,body);return NextResponse.json({success:true});}
 if(kind==='profile'){
  const b=z.object({name:z.string().trim().min(1).max(120),email:z.string().trim().email().transform(v=>v.toLowerCase()),password:z.string().min(12).max(72).optional()}).parse(body);
  const {hash}=await import('bcryptjs');await db.query('UPDATE qb_pos.users SET name=$2,email=$3 WHERE id=$1',[actor.id,b.name,b.email]);if(b.password)await db.query('UPDATE qb_pos.users SET password=$2 WHERE id=$1',[actor.id,await hash(b.password,12)]);return NextResponse.json({success:true});
 }
 if(kind==='drawer'){authorize(actor,'sales','create');await s.audit('drawer','register',{note:str(body.note)});return NextResponse.json({message:'Drawer opening recorded. A physical drawer requires a connected printer or hardware bridge.'});}
 if(kind==='alerts'){
  authorize(actor,'admin','update');const settings=await s.settings(),email=str(settings.notifications.email);if(!email)throw new AppError('Add an alert email address in Notification Preferences');if(!process.env.SMTP_HOST)throw new AppError('Add SMTP settings in Vercel to deliver email alerts',503);
  await sendEmail({to:email,subject:'Que Bros Perfumery — Test alert',html:'<h1>Que Bros Perfumery</h1><p>Your boutique email alerts are connected.</p>'});return NextResponse.json({message:'Test alert sent'});
 }
 if(kind==='email-invoice'){
  authorize(actor,'sales','read');if(!process.env.SMTP_HOST)throw new AppError('Add SMTP settings in Vercel to email invoices',503);
  const sale=(await new Store(db).orders(actor.owner,id))[0];if(!sale)throw new AppError('Invoice not found',404);if(sale.customerEmail.endsWith('.invalid'))throw new AppError('This walk-in customer has no email address');
  const settings=await s.settings();await sendEmail({to:sale.customerEmail,subject:`Que Bros Perfumery — ${str(sale.invoiceNumber||sale.orderNumber)}`,html:`<h1>Que Bros Perfumery</h1><p>Hello ${escape(sale.customerName)},</p><p>Invoice ${escape(sale.invoiceNumber||sale.orderNumber)}</p><p>Total: ${escape(settings.general.currency)} ${sale.totalAmount.toFixed(2)}</p><p>Paid: ${num(sale.paid).toFixed(2)} · Balance: ${Math.max(0,sale.totalAmount-num(sale.paid)).toFixed(2)}</p><p>${escape(settings.sales.receiptFooter)}</p>`});return NextResponse.json({message:'Invoice emailed'});
 }
 if(req.method==='DELETE'){await s.remove(kind,id);return NextResponse.json({success:true});}
 return NextResponse.json(await s.save(kind,id,body));
});}
export const GET=handle,POST=handle,PATCH=handle,DELETE=handle;
