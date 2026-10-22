import { randomUUID } from 'node:crypto';
import { hash,compare } from 'bcryptjs';
import { z } from 'zod';
import { Store } from '../db/store';
import type { Database } from '../db/db';
import { AppError } from '../errors';
import { authorize,moduleFor } from './access';
import { defaultSettings,defaultPermissions,permissionsModules,permissionActions,str,num,type Actor,type Data,type Entry } from './types';

const name=z.string().trim().min(1).max(200),optional=z.string().trim().max(1000).default('');
const money=z.coerce.number().finite().min(0).max(999999999),qty=z.coerce.number().int().positive().max(100000000);
const status=z.enum(['active','inactive']).default('active');
const schemas:Record<string,z.ZodType>={
 categories:z.object({name,code:optional,slug:optional,parent:optional,status}),
 brands:z.object({name,code:optional,website:z.union([z.literal(''),z.string().url()]).default(''),logo:optional,status}),
 units:z.object({name,symbol:name,baseUnit:optional,operator:z.enum(['*','/']).default('*'),value:z.coerce.number().positive().max(1000000).default(1),status}),
 customers:z.object({name,email:z.union([z.literal(''),z.string().email()]).default(''),phone:optional,address:optional,company:optional,tag:optional,status}),
 suppliers:z.object({name,contact:optional,email:z.union([z.literal(''),z.string().email()]).default(''),phone:optional,address:optional,category:optional,taxId:optional,paymentTerms:optional,status}),
 expenses:z.object({title:name,payee:optional,category:name,date:z.string().date(),amount:money,paymentMethod:name,paidBy:optional,status:z.enum(['pending','approved']).default('approved'),notes:optional}),
};
const line=z.object({productId:name,quantity:qty,cost:money.default(0),tax:z.coerce.number().min(0).max(100).default(0),barcode:optional});
const purchaseInput=z.object({supplierId:name,date:z.string().date(),dueDate:z.string().date().optional(),expectedDate:z.string().date().optional(),warehouse:name,status:z.enum(['pending','ordered','received','cancelled']),items:z.array(line).min(1).max(100),discount:money.default(0),shipping:money.default(0),paid:money.default(0),paymentMethod:name,notes:optional,managerPassword:z.string().max(72).optional()});
const saleInput=z.object({customerName:name.default('Walk-in Customer'),customerEmail:z.union([z.literal(''),z.string().email()]).default(''),items:z.array(z.object({productId:name,quantity:qty})).min(1).max(100),discount:z.coerce.number().min(0).max(100).default(0),tax:z.coerce.number().min(0).max(100).default(0),paid:money.default(0),paymentMethod:name.default('Cash'),dueDate:z.string().date().optional(),notes:optional,managerPassword:z.string().max(72).optional(),complete:z.boolean().default(true)});

export class SuiteService {
 constructor(public db:Database,public actor:Actor){}
 get owner(){return this.actor.owner;}
 async records(kind?:string):Promise<Entry[]> {
  const rows=await this.db.query<{id:string;kind:string;data:Data;created_at:Date;updated_at:Date}>(`SELECT * FROM qb_pos.records WHERE owner_id=$1 ${kind?'AND kind=$2':''} ORDER BY created_at DESC,id`,kind?[this.owner,kind]:[this.owner]);
  return rows.map(r=>({id:r.id,kind:r.kind,data:r.data,createdAt:new Date(r.created_at).toISOString(),updatedAt:new Date(r.updated_at).toISOString()}));
 }
 async find(kind:string,id:string,lock=false) {
  const r=(await this.db.query<{id:string;data:Data}>('SELECT id,data FROM qb_pos.records WHERE owner_id=$1 AND kind=$2 AND id=$3'+(lock?' FOR UPDATE':''),[this.owner,kind,id]))[0];
  if(!r)throw new AppError('Record not found',404);return r;
 }
 async put(kind:string,id:string,data:Data):Promise<Data & {id:string}> {
  await this.db.query(`INSERT INTO qb_pos.records(id,owner_id,kind,data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=now() WHERE qb_pos.records.owner_id=excluded.owner_id AND qb_pos.records.kind=excluded.kind`,[id,this.owner,kind,JSON.stringify(data)]);
  return {id,...data};
 }
 async audit(action:string,resource:string,details:Data={}) {await this.db.query('INSERT INTO qb_pos.audit(id,owner_id,actor_id,action,resource,details) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),this.owner,this.actor.id,action,resource,JSON.stringify(details)]);}
 async seed(){
  for(const [key,permissions] of Object.entries(defaultPermissions)){
   const title={administrator:'Administrator',manager:'Store Manager',cashier:'Cashier',inventory:'Inventory Clerk'}[key]!;
   await this.db.query('INSERT INTO qb_pos.records(id,owner_id,kind,data) VALUES($1,$2,$3,$4::jsonb) ON CONFLICT(id) DO NOTHING',[`${this.owner}-role-${key}`,this.owner,'roles',JSON.stringify({key,name:title,permissions,status:'active'})]);
  }
 }
 async settings(){const result=structuredClone(defaultSettings);for(const r of await this.records('settings'))result[str(r.data.group)]={...result[str(r.data.group)],...r.data};return result;}
 async saveSettings(group:string,input:unknown){
  authorize(this.actor,'admin','update');
  if(!defaultSettings[group])throw new AppError('Unknown settings group');
  const raw=z.record(z.string(),z.unknown()).parse(input),data:Data={group};
  for(const [key,def] of Object.entries(defaultSettings[group])){
   const v=raw[key]??def;
   if(typeof def==='boolean')data[key]=z.boolean().parse(v);
   else if(typeof def==='number')data[key]=z.coerce.number().finite().min(0).max(key.toLowerCase().includes('tax')||key==='maxDiscount'?100:10000000).parse(v);
   else data[key]=z.string().max(key==='logo'?2000000:2000).parse(v);
  }
  if(group==='general'){
   z.enum(['PHP','USD','EUR','GBP','INR','BDT']).parse(data.currency);
   try{new Intl.DateTimeFormat('en',{timeZone:str(data.timezone)});}catch{throw new AppError('Choose a valid timezone');}
   await new Store(this.db).saveBusiness(this.owner,{businessName:data.businessName,address:data.address,phone:data.phone,email:data.email,currency:data.currency,weightUnit:'pcs',lowStockThreshold:num((await this.settings()).inventory.lowStockThreshold)});
  }
  if(group==='notifications'&&data.email)z.string().email().parse(data.email);
  if(group==='inventory'&&data.outOfStockAction!=='block')throw new AppError('Stock protection must remain enabled');
  await this.put('settings',`${this.owner}-settings-${group}`,data);await this.audit('update',`settings/${group}`);return data;
 }
 async save(kind:string,id:string|undefined,input:unknown){
  authorize(this.actor,moduleFor(kind),id?'update':'create');
  if(!schemas[kind])throw new AppError('Unsupported record type');
  const data=schemas[kind].parse(input) as Data;
  return this.db.transaction(async tx=>{
   const s=new SuiteService(tx,this.actor);if(id)await s.find(kind,id,true);
   if(kind==='categories'&&data.parent){if(data.parent===id)throw new AppError('A category cannot be its own parent');let parent=str(data.parent);const visited=new Set(id?[id]:[]);while(parent){if(visited.has(parent))throw new AppError('Category hierarchy contains a cycle');visited.add(parent);parent=str((await s.find('categories',parent)).data.parent);}}
   if(kind==='units'&&data.baseUnit){if(data.baseUnit===id)throw new AppError('A unit cannot reference itself');const base=await s.find('units',str(data.baseUnit));if(base.data.baseUnit)throw new AppError('Choose a base unit without a conversion');}
   const result=await s.put(kind,id||randomUUID(),{...data,...(kind==='expenses'?{reference:id?(await s.find(kind,id)).data.reference:`QB-EXP-${Date.now().toString(36).toUpperCase()}`}:{})});
   await s.audit(id?'update':'create',kind,{id:result.id});return result;
  });
 }
 async remove(kind:string,id:string){
  authorize(this.actor,moduleFor(kind),'delete');if(!schemas[kind])throw new AppError('Posted transactions cannot be deleted. Use a return or cancellation.');
  return this.db.transaction(async tx=>{
   const s=new SuiteService(tx,this.actor),r=await s.find(kind,id,true);
   const linked=kind==='categories'?'category':kind==='brands'?'brand':kind==='units'?'unit':null;
   if(linked){const products=await new Store(tx).products(this.owner);if(products.some(p=>str(p[linked as keyof typeof p])===str(r.data.name)||str(p[linked as keyof typeof p])===str(r.data.symbol)))throw new AppError('This entry is assigned to products. Reassign them first.',409);}
   const children=await s.records(kind);if(children.some(e=>e.data.parent===id||e.data.baseUnit===id))throw new AppError('This entry is used by another entry.',409);
   await tx.query('DELETE FROM qb_pos.records WHERE owner_id=$1 AND id=$2',[this.owner,id]);await s.audit('delete',kind,{id});
  });
 }
 async adjustment(input:unknown){
  authorize(this.actor,'inventory','update');
  const b=z.object({productId:name,type:z.enum(['addition','subtraction']),quantity:qty,warehouse:name,reason:name,notes:optional}).parse(input);
  return this.db.transaction(async tx=>{
   const [p]=await tx.query<{quantity:number;cost_price:string;name:string;sku:string}>('SELECT quantity,cost_price,name,sku FROM qb_pos.products WHERE id=$1 AND owner_id=$2 FOR UPDATE',[b.productId,this.owner]);
   if(!p)throw new AppError('Product not found',404);const delta=b.type==='addition'?b.quantity:-b.quantity;
   if(p.quantity+delta<0)throw new AppError('An adjustment cannot make stock negative',409);
   await tx.query('UPDATE qb_pos.products SET quantity=quantity+$3,updated_at=now() WHERE id=$1 AND owner_id=$2',[b.productId,this.owner,delta]);
   const s=new SuiteService(tx,this.actor),data={...b,reference:`QB-ADJ-${Date.now().toString(36).toUpperCase()}`,productName:p.name,sku:p.sku,delta,value:Math.round(Number(p.cost_price)*delta*100)/100,adjustedBy:this.actor.name,before:p.quantity,after:p.quantity+delta};
   const r=await s.put('adjustments',randomUUID(),data);await s.audit('adjust','inventory',data);return r;
  });
 }
 async purchase(input:unknown,id?:string){
  authorize(this.actor,'purchases',id?'update':'create');const b=purchaseInput.parse(input);
  return this.db.transaction(async tx=>{
   const s=new SuiteService(tx,this.actor);const settings=await s.settings();let old:Data={};
   if(id){old=(await s.find('purchases',id,true)).data;if(old.status==='received')throw new AppError('Received purchases are locked. Use a purchase return.',409);if(old.status==='cancelled')throw new AppError('Cancelled purchases cannot be changed.',409);}
   const supplier=await s.find('suppliers',b.supplierId);
   let subtotal=0,tax=0;const lines:Data[]=[];
   for(const i of [...b.items].sort((a,b)=>a.productId.localeCompare(b.productId))){
    const [p]=await tx.query<{name:string;sku:string;metadata:Data}>('SELECT name,sku,metadata FROM qb_pos.products WHERE owner_id=$1 AND id=$2 FOR UPDATE',[this.owner,i.productId]);if(!p)throw new AppError('Product not found',404);
    if(b.status==='received'&&settings.purchases.verifyBarcode===true&&(!str(p.metadata.barcode)||str(p.metadata.barcode)!==i.barcode))throw new AppError(`Add a catalog barcode and scan the correct barcode for ${p.name}`);
    const base=Math.round(i.cost*100)*i.quantity;subtotal+=base;tax+=Math.round(base*i.tax/100);lines.push({...i,name:p.name,sku:p.sku});
   }
   const cents=subtotal+tax-Math.round(b.discount*100)+Math.round(b.shipping*100);if(cents<0||!Number.isSafeInteger(cents)||cents>99999999999999)throw new AppError('Invalid purchase total');
   if(b.paid>cents/100)throw new AppError('Paid amount cannot exceed the purchase total');
   if(b.status==='received'&&cents/100>num(settings.purchases.approvalThreshold)&&!this.actor.isOwner&&this.actor.role!=='administrator'&&this.actor.role!=='manager')throw new AppError('This purchase requires manager approval',403);
   const termDays=Number(str(supplier.data.paymentTerms||settings.purchases.paymentTerms).match(/\d+/)?.[0]||0);
   const dueDate=b.dueDate||new Date(new Date(b.date).getTime()+termDays*86400000).toISOString().slice(0,10);
   const data={...b,dueDate,managerPassword:undefined,items:lines,subtotal:subtotal/100,taxAmount:tax/100,total:cents/100,balance:Math.round((cents/100-b.paid)*100)/100,supplierName:supplier.data.name,supplierEmail:supplier.data.email,reference:old.reference||`${str(settings.purchases.prefix)}${Date.now().toString(36).toUpperCase()}`,receivedAt:b.status==='received'?new Date().toISOString():null,stockApplied:b.status==='received'&&settings.purchases.autoReceive===true};
   if(data.stockApplied)for(const i of b.items)await tx.query('UPDATE qb_pos.products SET quantity=quantity+$3,cost_price=$4,updated_at=now() WHERE owner_id=$1 AND id=$2',[this.owner,i.productId,i.quantity,i.cost.toFixed(2)]);
   const result=await s.put('purchases',id||randomUUID(),data);await s.audit('purchase','purchases',{id:result.id,status:b.status});
   if(b.status==='received'&&settings.notifications.inbound===true)await new Store(tx).notify(this.owner,'new_order','Purchase received',`Stock received from ${str(supplier.data.name)}`,{purchaseId:result.id});
   return result;
  });
 }
 async sale(input:unknown){
  authorize(this.actor,'sales','create');const b=saleInput.parse(input);
  return this.db.transaction(async tx=>{
   const s=new SuiteService(tx,this.actor),settings=await s.settings();
   const methodKey:Record<string,string>={'Cash':'cash','Credit / Debit Card':'card','Bank Transfer':'transfer','Store Credit':'credit'};
   if(!methodKey[b.paymentMethod]||settings.sales[methodKey[b.paymentMethod]]!==true)throw new AppError('This payment method is disabled');
   if(b.discount>num(settings.sales.maxDiscount)&&!this.actor.isOwner&&this.actor.role!=='administrator'&&this.actor.role!=='manager'){
    const owner=await new Store(tx).user(this.owner);if(!b.managerPassword||!owner||!await compare(b.managerPassword,owner.password))throw new AppError('Manager authorization is required for this discount',403);
   }
   const store=new Store(tx);const order=await store.createOrder(this.owner,{customerName:b.customerName,customerEmail:b.customerEmail||'walk-in@quebros.invalid',items:b.items});
   const subtotal=order.totalAmount,discount=Math.round(subtotal*b.discount)/100,tax=Math.round((subtotal-discount)*b.tax)/100,total=Math.round((subtotal-discount+tax)*100)/100;
   const paid=b.paymentMethod==='Cash'?Math.min(b.paid,total):b.paid;if(b.paymentMethod!=='Cash'&&paid>total)throw new AppError('Paid amount cannot exceed the total');
   if(b.paymentMethod==='Cash'&&b.paid<total)throw new AppError('Tendered cash is less than the payable amount');
   const dueDate=b.dueDate||new Date(Date.now()+num(settings.sales.paymentTerm)*86400000).toISOString().slice(0,10);
   const metadata={subtotal,discountPercent:b.discount,discountAmount:discount,taxPercent:b.tax,taxAmount:tax,paid,paymentMethod:b.paymentMethod,dueDate,notes:b.notes,change:Math.max(0,Math.round((b.paid-total)*100)/100),costTotal:order.items.reduce((sum,i)=>sum+i.costPrice*i.quantity,0),invoiceNumber:`${str(settings.sales.invoicePrefix)}${order.orderNumber.replace(/^QB-/,'')}`,customerEmail:b.customerEmail,createdByName:this.actor.name};
   await tx.query('UPDATE qb_pos.orders SET total_amount=$3,metadata=$4::jsonb,status=$5 WHERE owner_id=$1 AND id=$2',[this.owner,order._id,total.toFixed(2),JSON.stringify(metadata),b.complete?'completed':'pending']);
   await s.audit('checkout','sales',{id:order._id,total,paymentMethod:b.paymentMethod});store.hideCosts=!this.actor.isOwner&&!this.actor.permissions.inventory?.includes('read')&&!this.actor.permissions.reports?.includes('read');return (await store.orders(this.owner,order._id))[0];
  });
 }
 async returnItems(kind:'sales-returns'|'purchase-returns',input:unknown,id?:string){
  authorize(this.actor,moduleFor(kind),id?'update':'create');
  const b=z.object({sourceId:name,reason:name,restock:z.boolean().default(true),status:z.enum(['pending','approved','rejected']).default('approved'),items:z.array(z.object({productId:name,quantity:qty})).min(1).max(100)}).parse(input);
  if(b.status==='approved'&&!this.actor.isOwner&&!['administrator','manager','inventory'].includes(this.actor.role))throw new AppError('A manager must approve this return',403);
  return this.db.transaction(async tx=>{
   const s=new SuiteService(tx,this.actor);const returnPrefix=kind==='purchase-returns'?str((await s.settings()).purchases.returnPrefix):'QB-SRET-';let old:Data={};if(id){old=(await s.find(kind,id,true)).data;if(old.status!=='pending')throw new AppError('This return has already been processed',409);}
   let source:Data,original:{productId:string;quantity:number;price:number;cost:number}[];
   if(kind==='sales-returns'){
    const [row]=await tx.query('SELECT id FROM qb_pos.orders WHERE id=$1 AND owner_id=$2 FOR UPDATE',[b.sourceId,this.owner]);if(!row)throw new AppError('Sale not found',404);
    const order=(await new Store(tx).orders(this.owner,b.sourceId))[0];if(order.status!=='completed')throw new AppError('Only completed sales can be returned');
    source={reference:order.orderNumber,name:order.customerName,email:order.customerEmail,taxShare:num((order as Record<string,unknown>).taxAmount)/(order.totalAmount||1)};
    const factor=order.totalAmount/(num(order.subtotal)||order.totalAmount||1);
    original=order.items.map(i=>({productId:i.product._id,quantity:i.quantity,price:Math.round(i.price*factor*100)/100,cost:i.costPrice}));
   }else{
    const purchase=await s.find('purchases',b.sourceId,true);if(purchase.data.status!=='received')throw new AppError('Only received purchases can be returned');
    source={reference:purchase.data.reference,name:purchase.data.supplierName};original=(purchase.data.items as Data[]).map(i=>({productId:str(i.productId),quantity:num(i.quantity),price:num(i.cost)*(1+num(i.tax)/100),cost:num(i.cost)}));
   }
   const merged=new Map<string,number>();for(const i of b.items)merged.set(i.productId,(merged.get(i.productId)||0)+i.quantity);
   const previous=(await s.records(kind)).filter(r=>r.id!==id&&r.data.sourceId===b.sourceId&&r.data.status!=='rejected');let refund=0,cost=0;
   for(const [productId,quantity] of [...merged].sort(([a],[b])=>a.localeCompare(b))){
    const purchased=original.filter(i=>i.productId===productId),available=purchased.reduce((sum,i)=>sum+i.quantity,0);
    const already=previous.reduce((sum,r)=>sum+(r.data.items as Data[]).filter(i=>i.productId===productId).reduce((s,i)=>s+num(i.quantity),0),0);
    if(!purchased.length||quantity>available-already)throw new AppError('Return quantity exceeds the remaining eligible quantity',409);
    const [p]=await tx.query<{quantity:number}>('SELECT quantity FROM qb_pos.products WHERE id=$1 AND owner_id=$2 FOR UPDATE',[productId,this.owner]);
    if(b.status==='approved'){
     if(kind==='purchase-returns'){if(!p||p.quantity<quantity)throw new AppError('Insufficient stock for supplier return',409);await tx.query('UPDATE qb_pos.products SET quantity=quantity-$3 WHERE owner_id=$1 AND id=$2',[this.owner,productId,quantity]);}
     else if(b.restock){if(!p)throw new AppError('Cannot restock a deleted product');await tx.query('UPDATE qb_pos.products SET quantity=quantity+$3 WHERE owner_id=$1 AND id=$2',[this.owner,productId,quantity]);}
    }
    refund+=purchased.reduce((sum,i)=>sum+i.price*i.quantity,0)/available*quantity;cost+=purchased.reduce((sum,i)=>sum+i.cost*i.quantity,0)/available*quantity;
   }
   const result=await s.put(kind,id||randomUUID(),{...b,items:[...merged].map(([productId,quantity])=>({productId,quantity})),sourceReference:source.reference,contactName:source.name,reference:old.reference||`${returnPrefix}${Date.now().toString(36).toUpperCase()}`,refund:Math.round(refund*100)/100,taxRefund:Math.round(refund*num(source.taxShare)*100)/100,costRestored:b.restock?cost:0,processedBy:this.actor.name});
   await s.audit('return',kind,{id:result.id,status:b.status});return result;
  });
 }
 async payment(id:string,input:unknown){
  authorize(this.actor,'sales','update');const b=z.object({amount:money.positive(),paymentMethod:name}).parse(input);
  return this.db.transaction(async tx=>{
   const [row]=await tx.query<{total_amount:string;metadata:Data;status:string}>('SELECT * FROM qb_pos.orders WHERE owner_id=$1 AND id=$2 FOR UPDATE',[this.owner,id]);if(!row)throw new AppError('Invoice not found',404);if(row.status==='cancelled')throw new AppError('Cancelled invoices cannot be paid');
   const paid=num(row.metadata.paid)+b.amount;if(Math.round(paid*100)>Math.round(Number(row.total_amount)*100))throw new AppError('Payment exceeds the outstanding balance');
   const metadata={...row.metadata,paid:Math.round(paid*100)/100,paymentMethod:b.paymentMethod};
   await tx.query('UPDATE qb_pos.orders SET metadata=$3::jsonb WHERE owner_id=$1 AND id=$2',[this.owner,id,JSON.stringify(metadata)]);await new SuiteService(tx,this.actor).audit('payment','invoices',{id,amount:b.amount});return {success:true};
  });
 }
 async saveRole(id:string,input:unknown){
  authorize(this.actor,'admin','update');const r=await this.find('roles',id);
  if(r.data.key==='administrator')throw new AppError('Administrator permissions are fixed');
  const raw=z.object({permissions:z.record(z.string(),z.array(z.enum(['read','create','update','delete'])))}).parse(input);
  const permissions=Object.fromEntries(permissionsModules.map(m=>[m,(raw.permissions[m]||[]).filter(a=>permissionActions.includes(a))]));
  await this.put('roles',id,{...r.data,permissions});await this.audit('permissions','roles',{id});
 }
 async saveMember(input:unknown,id?:string){
  authorize(this.actor,'admin',id?'update':'create');
  const b=z.object({name,email:z.string().trim().email().transform(v=>v.toLowerCase()),password:z.string().max(72).optional(),roleId:name,warehouse:name,active:z.boolean().default(true)}).parse(input);
  if(!id&&(!b.password||b.password.length<12))throw new AppError('A new team member needs a password of at least 12 characters');
  if(b.password&&b.password.length<12)throw new AppError('Password must contain at least 12 characters');
  await this.find('roles',b.roleId);
  return this.db.transaction(async tx=>{
   const userId=id||randomUUID();
   if(id){if(id===this.owner)throw new AppError('Edit the owner through My Profile');const exists=await tx.query('SELECT user_id FROM qb_pos.memberships WHERE user_id=$1 AND owner_id=$2 FOR UPDATE',[id,this.owner]);if(!exists.length)throw new AppError('Staff member not found',404);}
   if(id){await tx.query('UPDATE qb_pos.users SET name=$2,email=$3 WHERE id=$1',[id,b.name,b.email]);if(b.password)await tx.query('UPDATE qb_pos.users SET password=$2 WHERE id=$1',[id,await hash(b.password,12)]);}
   else await tx.query('INSERT INTO qb_pos.users(id,name,email,password,is_verified) VALUES($1,$2,$3,$4,true)',[userId,b.name,b.email,await hash(b.password!,12)]);
   await tx.query(`INSERT INTO qb_pos.memberships(user_id,owner_id,role_id,warehouse,active) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET role_id=excluded.role_id,warehouse=excluded.warehouse,active=excluded.active WHERE qb_pos.memberships.owner_id=excluded.owner_id`,[userId,this.owner,b.roleId,b.warehouse,b.active]);
   await new SuiteService(tx,this.actor).audit('staff','users',{id:userId});return {id:userId};
  });
 }
 async state(){
  await this.seed();const all=await this.records(),settings=await this.settings(),store=new Store(this.db);
  const can=(module:string)=>this.actor.isOwner||this.actor.permissions[module]?.includes('read');
  const productRead=can('inventory')||can('sales')||can('purchases')||can('reports');const showCosts=can('inventory')||can('reports');
  const products=productRead?await store.products(this.owner):[];
  const sales=can('sales')||can('reports')||can('customers')?await store.orders(this.owner):[];
  const members=can('admin')?await this.db.query(`SELECT u.id,u.name,u.email,m.role_id AS "roleId",m.warehouse,m.active,m.last_login AS "lastLogin" FROM qb_pos.memberships m JOIN qb_pos.users u ON u.id=m.user_id WHERE m.owner_id=$1 ORDER BY u.name`,[this.owner]):[];
  if(can('admin')){const owner=await store.user(this.owner);if(owner)members.unshift({id:owner.id,name:owner.name,email:owner.email,roleId:`${this.owner}-role-administrator`,warehouse:'Que Bros Boutique',active:true,isOwner:true});}
  return {actor:this.actor,products:products.map(p=>showCosts?p:{...p,costPrice:0}),sales:sales.map(o=>showCosts?o:{...o,costTotal:0,items:o.items.map(i=>({...i,costPrice:0}))}),records:all.filter(r=>r.kind==='settings'||can(moduleFor(r.kind))).map(r=>showCosts?r:{...r,data:{...r.data,costRestored:undefined}}),settings,members,notifications:await store.notifications(this.owner,false,20),audit:can('admin')?await this.db.query('SELECT a.action,a.resource,a.details,a.created_at AS "createdAt",u.name AS actor FROM qb_pos.audit a LEFT JOIN qb_pos.users u ON u.id=a.actor_id WHERE a.owner_id=$1 ORDER BY a.created_at DESC LIMIT 100',[this.owner]):[]};
 }
}
