import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { Database } from './db';
import { AppError } from '../errors';
import { productInput, orderInput, businessInput, preferencesInput } from '../validation';

type ProductRow = { id:string; owner_id:string; name:string; sku:string; description:string; category:string; quantity:number; reorder_level:number; cost_price:string; sell_price:string; unit:string; image:string; metadata?:Record<string,unknown>; created_at:Date; updated_at:Date };
export type UserRow = { id:string; name:string; email:string; password:string; is_verified:boolean; preferences:z.infer<typeof preferencesInput>; verification_token:string|null; verification_expires:Date|null };
type OrderRow = { id:string; owner_id:string; order_number:string; customer_name:string; customer_email:string; total_amount:string; metadata?:Record<string,unknown>&{paid?:number;subtotal?:number;invoiceNumber?:string}; status:'pending'|'completed'|'cancelled'; created_at:Date; updated_at:Date };
type ItemRow = { id:string; order_id:string; product_id:string|null; product_key:string; name:string; image:string; quantity:number; price:string; cost_price?:string };
const productView = (p:ProductRow) => ({...p.metadata,_id:p.id,createdBy:p.owner_id,name:p.name,sku:p.sku,description:p.description,category:p.category,quantity:p.quantity,reorderLevel:p.reorder_level,costPrice:Number(p.cost_price),sellPrice:Number(p.sell_price),unit:p.unit,image:p.image,createdAt:p.created_at,updatedAt:p.updated_at});
const orderView = (o:OrderRow, items:ItemRow[]) => ({...o.metadata,_id:o.id,createdBy:o.owner_id,orderNumber:o.order_number,customerName:o.customer_name,customerEmail:o.customer_email,totalAmount:Number(o.total_amount),status:o.status,createdAt:o.created_at,updatedAt:o.updated_at,items:items.filter(i=>i.order_id===o.id).map(i=>({_id:i.id,product:{_id:i.product_key,name:i.name,image:i.image},name:i.name,quantity:i.quantity,price:Number(i.price),costPrice:Number(i.cost_price||0)}))});

export class Store {
 actorId?:string;
 hideCosts=false;
 constructor(public db:Database) {}
 async user(id:string) { return (await this.db.query<UserRow>('SELECT * FROM qb_pos.users WHERE id=$1',[id]))[0]; }
 async userByEmail(email:string) { return (await this.db.query<UserRow>('SELECT * FROM qb_pos.users WHERE email=$1',[email.toLowerCase()]))[0]; }
 async products(owner:string) { return (await this.db.query<ProductRow>('SELECT * FROM qb_pos.products WHERE owner_id=$1 ORDER BY created_at DESC,id',[owner])).map(productView); }
 async product(owner:string,id:string) {
  const p=(await this.db.query<ProductRow>('SELECT * FROM qb_pos.products WHERE owner_id=$1 AND id=$2',[owner,id]))[0];
  if(!p) throw new AppError('Product not found',404); return productView(p);
 }
 async createProduct(owner:string,input:unknown) {
  const p=productInput.parse(input);
  const row=(await this.db.query<ProductRow>(`INSERT INTO qb_pos.products(id,owner_id,name,sku,description,category,quantity,reorder_level,cost_price,sell_price,unit,image,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb) RETURNING *`,[randomUUID(),owner,p.name,p.sku,p.description,p.category,p.quantity,p.reorderLevel,p.costPrice.toFixed(2),p.sellPrice.toFixed(2),p.unit,p.image,JSON.stringify({brand:p.brand,barcode:p.barcode,status:p.status,tax:p.tax,discount:p.discount,maximumStock:p.maximumStock,warehouse:p.warehouse})]))[0];
  return productView(row);
 }
 async updateProduct(owner:string,id:string,input:unknown) {
  const raw=z.record(z.string(),z.unknown()).parse(input);
  // Zod defaults on optional fields must not reset stock/prices during a partial edit.
  const partial=Object.fromEntries(Object.entries(productInput.partial().parse(raw)).filter(([key])=>Object.hasOwn(raw,key)));
  return this.db.transaction(async tx=>{
   const existing=(await tx.query<ProductRow>('SELECT * FROM qb_pos.products WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,owner]))[0];
   if(!existing) throw new AppError('Product not found',404);
   const p=productInput.parse({...productView(existing),...partial});
   const row=(await tx.query<ProductRow>(`UPDATE qb_pos.products SET name=$3,sku=$4,description=$5,category=$6,quantity=$7,reorder_level=$8,cost_price=$9,sell_price=$10,unit=$11,image=$12,metadata=$13::jsonb,updated_at=now() WHERE id=$1 AND owner_id=$2 RETURNING *`,[id,owner,p.name,p.sku,p.description,p.category,p.quantity,p.reorderLevel,p.costPrice.toFixed(2),p.sellPrice.toFixed(2),p.unit,p.image,JSON.stringify({brand:p.brand,barcode:p.barcode,status:p.status,tax:p.tax,discount:p.discount,maximumStock:p.maximumStock,warehouse:p.warehouse})]))[0];
   const service=new Store(tx);
   if(row.quantity===0 && existing.quantity!==0) await service.notify(owner,'out_of_stock','Out of stock',`${p.name} is out of stock`,{productName:p.name});
   else if(row.quantity<row.reorder_level && (row.quantity!==existing.quantity || row.reorder_level!==existing.reorder_level)) await service.notify(owner,'low_stock','Low stock',`${p.name}: ${row.quantity} remaining`,{productName:p.name,currentStock:row.quantity});
   return productView(row);
  });
 }
 async deleteProduct(owner:string,id:string) {
  const rows=await this.db.query('DELETE FROM qb_pos.products WHERE id=$1 AND owner_id=$2 RETURNING id',[id,owner]);
  if(!rows.length) throw new AppError('Product not found',404);
 }
 async search(owner:string,query:string) {
  const q=query.replace(/[\\%_]/g,'\\$&');
  return (await this.db.query<ProductRow>("SELECT * FROM qb_pos.products WHERE owner_id=$1 AND (name ILIKE $2 OR sku ILIKE $2) ORDER BY name LIMIT 10",[owner,`%${q}%`])).map(productView);
 }
 async orders(owner:string,id?:string) {
  const rows=await this.db.query<OrderRow>(`SELECT * FROM qb_pos.orders WHERE owner_id=$1 ${id?'AND id=$2':''} ORDER BY created_at DESC,id`,id?[owner,id]:[owner]);
  if(!rows.length) return [];
  const items=await this.db.query<ItemRow>('SELECT * FROM qb_pos.order_items WHERE order_id=ANY($1::text[]) ORDER BY id',[rows.map(r=>r.id)]);
  return rows.map(o=>{const value=orderView(o,items);return this.hideCosts?{...value,costTotal:0,items:value.items.map(i=>({...i,costPrice:0}))}:value;});
 }
 async createOrder(owner:string,input:unknown) {
  const body=orderInput.parse(input);
  // Merge duplicate lines before checking stock and acquire row locks in a stable order.
  const quantities=new Map<string,number>();
  for(const i of body.items) quantities.set(i.productId,(quantities.get(i.productId)||0)+i.quantity);
  return this.db.transaction(async tx=>{
   const products=await tx.query<ProductRow>('SELECT * FROM qb_pos.products WHERE owner_id=$1 AND id=ANY($2::text[]) ORDER BY id FOR UPDATE',[owner,[...quantities.keys()]]);
   if(products.length!==quantities.size) throw new AppError('One or more products are unavailable',404);
   let cents=0;
   for(const p of products) {
    if(p.metadata?.status==='inactive') throw new AppError(`${p.name} is inactive`,409);
    const qty=quantities.get(p.id)!;
    if(p.quantity<qty) throw new AppError(`Insufficient stock for ${p.name}. Only ${p.quantity} available.`,409);
    cents+=Math.round(Number(p.sell_price)*100)*qty;
   }
   if(!Number.isSafeInteger(cents)||cents>99999999999999) throw new AppError('Order total is too large');
   const orderId=randomUUID();
   const row=(await tx.query<OrderRow>(`INSERT INTO qb_pos.orders(id,owner_id,order_number,customer_name,customer_email,total_amount) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[orderId,owner,`QB-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0,8).toUpperCase()}`,body.customerName,body.customerEmail,(cents/100).toFixed(2)]))[0];
   const items:ItemRow[]=[];
   const service=new Store(tx);
   for(const p of products) {
    const qty=quantities.get(p.id)!;
    items.push((await tx.query<ItemRow>(`INSERT INTO qb_pos.order_items(id,order_id,product_id,product_key,name,image,quantity,price,cost_price) VALUES($1,$2,$3,$3,$4,$5,$6,$7,$8) RETURNING *`,[randomUUID(),orderId,p.id,p.name,p.image,qty,p.sell_price,p.cost_price]))[0]);
    await tx.query('UPDATE qb_pos.products SET quantity=quantity-$2,updated_at=now() WHERE id=$1',[p.id,qty]);
    const left=p.quantity-qty;
    if(left===0) await service.notify(owner,'out_of_stock','Out of stock',`${p.name} is out of stock`,{productName:p.name});
    else if(left<p.reorder_level) await service.notify(owner,'low_stock','Low stock',`${p.name}: ${left} remaining`,{productName:p.name,currentStock:left});
   }
   await service.notify(owner,'new_order','New order',`Order from ${body.customerName}`,{customerName:body.customerName,amount:cents/100});
   const value=orderView(row,items);return this.hideCosts?{...value,costTotal:0,items:value.items.map(i=>({...i,costPrice:0}))}:value;
  });
 }
 async updateOrder(owner:string,id:string,status:'pending'|'completed'|'cancelled') {
  return this.db.transaction(async tx=>{
   const row=(await tx.query<OrderRow>('SELECT * FROM qb_pos.orders WHERE id=$1 AND owner_id=$2 FOR UPDATE',[id,owner]))[0];
   if(!row) throw new AppError('Order not found',404);
   if(row.status==='cancelled' && status!=='cancelled') throw new AppError('A cancelled order cannot be reopened. Create a new sale.',409);
   if(status==='cancelled' && row.status!=='cancelled') {
    const returns=await tx.query("SELECT id FROM qb_pos.records WHERE owner_id=$1 AND kind='sales-returns' AND data->>'sourceId'=$2 AND data->>'status'='approved'",[owner,id]);
    if(returns.length)throw new AppError('This sale has approved returns and cannot be cancelled.',409);
    const items=await tx.query<ItemRow>('SELECT * FROM qb_pos.order_items WHERE order_id=$1 ORDER BY product_id',[id]);
    for(const i of items) if(i.product_id) await tx.query('UPDATE qb_pos.products SET quantity=quantity+$2,updated_at=now() WHERE id=$1 AND owner_id=$3',[i.product_id,i.quantity,owner]);
   }
   await tx.query('UPDATE qb_pos.orders SET status=$3,updated_at=now() WHERE id=$1 AND owner_id=$2',[id,owner,status]);
   return (await new Store(tx).orders(owner,id))[0];
  });
 }
 async customers(owner:string) { return this.db.query('SELECT DISTINCT customer_name AS "customerName",customer_email AS "customerEmail" FROM qb_pos.orders WHERE owner_id=$1 ORDER BY "customerName"',[owner]); }
 async notify(owner:string,type:string,title:string,message:string,metadata:Record<string,unknown>) {
  const user=await this.user(owner);
  const key=type==='new_order'?'newOrderNotification':type==='low_stock'?'lowStockNotifications':'outOfStockNotification';
  if(user?.preferences?.[key]===false) return;
  await this.db.query('INSERT INTO qb_pos.notifications(id,owner_id,type,title,message,metadata) VALUES($1,$2,$3,$4,$5,$6::jsonb)',[randomUUID(),owner,type,title,message,JSON.stringify(metadata)]);
 }
 async notifications(owner:string,unread:boolean,limit:number) {
  const rows=await this.db.query<{id:string;type:string;title:string;message:string;read:boolean;metadata:unknown;created_at:Date}>(`SELECT * FROM qb_pos.notifications WHERE owner_id=$1 ${unread?'AND read=false':''} ORDER BY created_at DESC LIMIT $2`,[owner,limit]);
  return rows.map(n=>({_id:n.id,type:n.type,title:n.title,message:n.message,read:n.read,metadata:n.metadata,createdAt:n.created_at}));
 }
 async markRead(owner:string,id:string) {
  const row=(await this.db.query('UPDATE qb_pos.notifications SET read=true WHERE id=$1 AND owner_id=$2 RETURNING id',[id,owner]))[0];
  if(!row) throw new AppError('Notification not found',404);
 }
 async business(owner:string) {
  const r=(await this.db.query<{business_name:string;address:string;phone:string;email:string;currency:string;weight_unit:string;low_stock_threshold:number}>('SELECT * FROM qb_pos.businesses WHERE owner_id=$1',[owner]))[0];
  return r?{exists:true,businessName:r.business_name,address:r.address,phone:r.phone,email:r.email,currency:r.currency,weightUnit:r.weight_unit,lowStockThreshold:r.low_stock_threshold}:{exists:false,businessName:'Que Bros Perfumery',address:'',phone:'',email:'',currency:'PHP',weightUnit:'pcs',lowStockThreshold:5};
 }
 async saveBusiness(owner:string,input:unknown) {
  const b=businessInput.parse(input);
  await this.db.query(`INSERT INTO qb_pos.businesses(owner_id,business_name,address,phone,email,currency,weight_unit,low_stock_threshold) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(owner_id) DO UPDATE SET business_name=excluded.business_name,address=excluded.address,phone=excluded.phone,email=excluded.email,currency=excluded.currency,weight_unit=excluded.weight_unit,low_stock_threshold=excluded.low_stock_threshold`,[owner,b.businessName,b.address,b.phone,b.email,b.currency,b.weightUnit,b.lowStockThreshold]);
  return this.business(owner);
 }
 async stats(owner:string) {
  const summary=(await this.db.query<{totalRevenue:number;totalOrders:number;todayRevenue:number;todayOrders:number;pendingOrders:number;totalCustomers:number}>(`SELECT coalesce(sum(total_amount) FILTER(WHERE status='completed'),0)::float8 AS "totalRevenue",count(*) FILTER(WHERE status='completed')::int AS "totalOrders",coalesce(sum(total_amount) FILTER(WHERE status='completed' AND (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date),0)::float8 AS "todayRevenue",count(*) FILTER(WHERE status='completed' AND (created_at AT TIME ZONE 'Asia/Manila')::date=(now() AT TIME ZONE 'Asia/Manila')::date)::int AS "todayOrders",count(*) FILTER(WHERE status='pending')::int AS "pendingOrders",count(DISTINCT customer_email)::int AS "totalCustomers" FROM qb_pos.orders WHERE owner_id=$1`,[owner]))[0];
  const [{count}]=await this.db.query<{count:number}>('SELECT count(*)::int AS count FROM qb_pos.products WHERE owner_id=$1',[owner]);
  const lowStockProducts=await this.db.query('SELECT name,quantity FROM qb_pos.products WHERE owner_id=$1 AND quantity<reorder_level ORDER BY quantity,name',[owner]);
  const recentOrders=await this.db.query(`SELECT id AS "_id",order_number AS "orderNumber",customer_name AS "customerName",total_amount::float8 AS "totalAmount",status,created_at AS "createdAt" FROM qb_pos.orders WHERE owner_id=$1 ORDER BY created_at DESC LIMIT 5`,[owner]);
  return {...summary,totalProducts:count,lowStockProducts,recentOrders};
 }
 async salesReport(owner:string,start:Date,end:Date) {
  const data=await this.db.query<{date:string;totalRevenue:number;orderCount:number;averageOrderValue:number}>(`SELECT to_char(created_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS date,sum(total_amount)::float8 AS "totalRevenue",count(*)::int AS "orderCount",avg(total_amount)::float8 AS "averageOrderValue" FROM qb_pos.orders WHERE owner_id=$1 AND status='completed' AND created_at BETWEEN $2 AND $3 GROUP BY date ORDER BY date`,[owner,start,end]);
  return {success:true,report:'sales',dateRange:{start,end},summary:{totalRevenue:data.reduce((s,d)=>s+d.totalRevenue,0),totalOrders:data.reduce((s,d)=>s+d.orderCount,0),period:`${start.toISOString().slice(0,10)} to ${end.toISOString().slice(0,10)}`},data};
 }
 async productReport(owner:string,start:Date,end:Date,sort:string,limit:number) {
  const sorting={revenue:'"revenue" DESC',quantity:'"quantitySold" DESC',name:'"name" ASC'}[sort];
  if(!sorting) throw new AppError('Invalid sort field');
  const data=await this.db.query<{productId:string;name:string;quantitySold:number;revenue:number;averagePrice:number}>(`SELECT i.product_key AS "productId",max(i.name) AS name,sum(i.quantity)::int AS "quantitySold",sum(i.quantity*i.price)::float8 AS revenue,round(sum(i.quantity*i.price)/sum(i.quantity),2)::float8 AS "averagePrice" FROM qb_pos.order_items i JOIN qb_pos.orders o ON o.id=i.order_id WHERE o.owner_id=$1 AND o.status='completed' AND o.created_at BETWEEN $2 AND $3 GROUP BY i.product_key ORDER BY ${sorting} LIMIT $4`,[owner,start,end,limit]);
  return {success:true,report:'products',dateRange:{start,end},summary:{totalProducts:data.length,totalRevenue:data.reduce((s,p)=>s+p.revenue,0),totalItemsSold:data.reduce((s,p)=>s+p.quantitySold,0)},data};
 }
 async customerReport(owner:string,start:Date,end:Date,sort:string,limit:number) {
  const sorting={revenue:'"totalSpent" DESC',orders:'"totalOrders" DESC',recency:'"lastOrderDate" DESC',name:'"customerName" ASC'}[sort];
  if(!sorting) throw new AppError('Invalid sort field');
  const data=await this.db.query<{customerEmail:string;customerName:string;totalSpent:number;totalOrders:number;averageOrderValue:number;firstOrderDate:Date;lastOrderDate:Date}>(`SELECT customer_email AS "customerEmail",max(customer_name) AS "customerName",sum(total_amount)::float8 AS "totalSpent",count(*)::int AS "totalOrders",round(avg(total_amount),2)::float8 AS "averageOrderValue",min(created_at) AS "firstOrderDate",max(created_at) AS "lastOrderDate" FROM qb_pos.orders WHERE owner_id=$1 AND status='completed' AND created_at BETWEEN $2 AND $3 GROUP BY customer_email ORDER BY ${sorting} LIMIT $4`,[owner,start,end,limit]);
  const revenue=data.reduce((s,c)=>s+c.totalSpent,0),orders=data.reduce((s,c)=>s+c.totalOrders,0);
  return {success:true,report:'customers',dateRange:{start,end},summary:{totalCustomers:data.length,totalRevenue:revenue,totalOrders:orders,averageRevenuePerCustomer:data.length?revenue/data.length:0,averageOrdersPerCustomer:data.length?orders/data.length:0},data};
 }
}
