import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PGlite, type Transaction } from '@electric-sql/pglite';
import { compare } from 'bcryptjs';
import { schemaStatements } from '../lib/db/schema';
import { Store } from '../lib/db/store';
import { bootstrapOwner, type Database } from '../lib/db/db';

function adapter(pg:PGlite|Transaction):Database {
 return {
  async query<T>(text:string,values:unknown[]=[]) {return (await pg.query<T>(text,values)).rows;},
  async transaction<T>(work:(tx:Database)=>Promise<T>) {
   if('transaction' in pg) return pg.transaction(tx=>work(adapter(tx)));
   return work(adapter(pg));
  },
 };
}
test('PostgreSQL persistence and business workflows',async t=>{
 const pg=new PGlite();
 const db=adapter(pg),store=new Store(db);
 try {
  for(const statement of schemaStatements) await db.query(statement);
  // Repeat the schema to verify idempotent first-run setup.
  for(const statement of schemaStatements) await db.query(statement);
  await db.query("INSERT INTO qb_pos.users(id,name,email,password,is_verified) VALUES('owner-a','Owner A','a@example.test','unused',true),('owner-b','Owner B','b@example.test','unused',true)");
  let first='',second='',orderId='';
  await t.test('create and update products, normalize amounts, reject invalid inputs',async()=>{
   const p=await store.createProduct('owner-a',{name:'Signature perfume',sku:'QB-01',quantity:10,reorderLevel:8,sellPrice:123.45,costPrice:70});first=p._id;
   second=(await store.createProduct('owner-a',{name:'Discovery set',sku:'QB-02',quantity:6,sellPrice:30}))._id;
   assert.equal(p.sellPrice,123.45);
   await assert.rejects(store.createProduct('owner-a',{name:'Bad',quantity:-1}));
   await assert.rejects(store.createProduct('owner-a',{name:'Bad',quantity:1.5}));
   await assert.rejects(store.createProduct('owner-a',{name:'Duplicate',sku:'qb-01'}));
   const updated=await store.updateProduct('owner-a',first,{description:'A premium fragrance',createdBy:'owner-b'});
   assert.equal(updated.name,'Signature perfume'); assert.equal(updated.createdBy,'owner-a');
  });
  await t.test('enforce owner isolation for reads, updates, search and deletes',async()=>{
   assert.equal((await store.products('owner-b')).length,0);
   assert.equal((await store.search('owner-b','Signature')).length,0);
   await assert.rejects(store.product('owner-b',first),/not found/);
   await assert.rejects(store.updateProduct('owner-b',first,{quantity:999}),/not found/);
   await assert.rejects(store.deleteProduct('owner-b',first),/not found/);
   assert.equal((await store.product('owner-a',first)).quantity,10);
  });
  await t.test('search treats percent and underscore literally',async()=>{
   assert.equal((await store.search('owner-a','%')).length,0);
   assert.equal((await store.search('owner-a','_')).length,0);
   assert.equal((await store.search('owner-a','QB-01')).length,1);
  });
  await t.test('multi-product order validates all stock before taking any',async()=>{
   await assert.rejects(store.createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:first,quantity:2},{productId:second,quantity:7}]}),/Insufficient stock/);
   assert.equal((await store.product('owner-a',first)).quantity,10); assert.equal((await store.orders('owner-a')).length,0);
  });
  await t.test('duplicate lines cannot bypass stock checks',async()=>{
   await assert.rejects(store.createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:first,quantity:6},{productId:first,quantity:6}]}),/Insufficient stock/);
   await assert.rejects(store.createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:first,quantity:-1}]}));
  });
  await t.test('create sale using database prices, reduce stock and create alerts',async()=>{
   const o=await store.createOrder('owner-a',{customerName:'Customer',customerEmail:'CUSTOMER@example.test',items:[{productId:first,quantity:2,price:0},{productId:first,quantity:1},{productId:second,quantity:1}]});
   orderId=o._id; assert.equal(o.totalAmount,400.35); assert.equal(o.items.length,2); assert.equal(o.customerEmail,'customer@example.test');
   assert.equal((await store.product('owner-a',first)).quantity,7);
   assert.equal((await store.notifications('owner-a',false,100)).length,2);
   assert.equal((await store.orders('owner-b')).length,0);
   await assert.rejects(store.updateOrder('owner-b',orderId,'completed'),/not found/);
  });
  await t.test('roll back stock and order when a later database write fails',async()=>{
   const faulty:Database={...db,transaction:work=>db.transaction(tx=>work({...tx,async query<T>(text:string,values:unknown[]=[]) {if(text.startsWith('INSERT INTO qb_pos.notifications')) throw new Error('Injected write failure');return tx.query<T>(text,values);}}))};
   await assert.rejects(new Store(faulty).createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:first,quantity:1}]}),/Injected/);
   assert.equal((await store.product('owner-a',first)).quantity,7); assert.equal((await store.orders('owner-a')).length,1);
  });
  await t.test('complete sale, calculate sales/product/customer reports and dashboard',async()=>{
   await store.updateOrder('owner-a',orderId,'completed');
   const start=new Date('2000-01-01'),end=new Date('2100-01-01');
   const stats=await store.stats('owner-a'); assert.equal(stats.totalRevenue,400.35);assert.equal(stats.totalOrders,1);assert.equal(stats.totalCustomers,1);
   const sales=await store.salesReport('owner-a',start,end);assert.equal(sales.summary.totalRevenue,400.35);
   const products=await store.productReport('owner-a',start,end,'revenue',10);assert.equal(products.data[0].quantitySold,3);assert.equal(products.data[0].revenue,370.35);
   const customers=await store.customerReport('owner-a',start,end,'revenue',10);assert.equal(customers.data[0].customerName,'Customer');assert.equal(customers.data[0].customerEmail,'customer@example.test');
   assert.equal((await store.stats('owner-b')).totalRevenue,0);
   await assert.rejects(store.productReport('owner-a',start,end,'revenue; DROP TABLE users',10),/Invalid sort/);
  });
  await t.test('cancellation restores stock once and cannot reopen',async()=>{
   await store.updateOrder('owner-a',orderId,'cancelled');
   await store.updateOrder('owner-a',orderId,'cancelled');
   assert.equal((await store.product('owner-a',first)).quantity,10);assert.equal((await store.stats('owner-a')).totalRevenue,0);
   await assert.rejects(store.updateOrder('owner-a',orderId,'pending'),/cannot be reopened/);
  });
  await t.test('zero stock cannot be sold, notification preferences respected',async()=>{
   await store.updateProduct('owner-a',first,{quantity:0});
   await assert.rejects(store.createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:first,quantity:1}]}),/Insufficient stock/);
   await db.query('DELETE FROM qb_pos.notifications');
   await db.query('UPDATE qb_pos.users SET preferences=$2::jsonb WHERE id=$1',['owner-a',JSON.stringify({newOrderNotification:false,lowStockNotifications:false,outOfStockNotification:false})]);
   await store.createOrder('owner-a',{customerName:'Customer',customerEmail:'customer@example.test',items:[{productId:second,quantity:1}]});
   assert.equal((await store.notifications('owner-a',false,100)).length,0);
  });
  await t.test('business settings persist independently for each owner',async()=>{
   await store.saveBusiness('owner-a',{businessName:'Que Bros',currency:'PHP',weightUnit:'pcs',lowStockThreshold:3});
   assert.equal((await store.business('owner-a')).lowStockThreshold,3);assert.equal((await store.business('owner-b')).exists,false);
  });
  await t.test('deleting a product preserves order snapshots and customer history',async()=>{
   await store.deleteProduct('owner-a',first);const order=(await store.orders('owner-a',orderId))[0];
   assert(order.items.some(i=>i.name==='Signature perfume'));assert.equal((await store.customers('owner-a')).length,1);
  });
  await t.test('owner bootstrap hashes password and never resets an existing account',async()=>{
   const saved={email:process.env.ADMIN_EMAIL,password:process.env.ADMIN_PASSWORD};
   try {
    process.env.ADMIN_EMAIL='owner@example.test';process.env.ADMIN_PASSWORD='An-owner-password-123';
    await bootstrapOwner(db);const first=await store.userByEmail('owner@example.test');assert(first?.is_verified);assert(await compare('An-owner-password-123',first.password));
    process.env.ADMIN_PASSWORD='A-different-password-123';await bootstrapOwner(db);assert.equal((await store.userByEmail('owner@example.test'))?.password,first.password);
   } finally {for(const [key,value] of Object.entries({ADMIN_EMAIL:saved.email,ADMIN_PASSWORD:saved.password})) {if(value===undefined) delete process.env[key];else process.env[key]=value;}}
  });
 } finally { await pg.close(); }
});
