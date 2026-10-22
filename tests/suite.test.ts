import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite,type Transaction} from '@electric-sql/pglite';
import {schemaStatements} from '../lib/db/schema';
import type {Database} from '../lib/db/db';
import {Store} from '../lib/db/store';
import {SuiteService} from '../lib/suite/service';
import {resolveActor,authorize} from '../lib/suite/access';
import {defaultPermissions,type Data} from '../lib/suite/types';
function adapter(pg:PGlite|Transaction):Database{return {async query<T>(sql:string,values:unknown[]=[]){return (await pg.query<T>(sql,values)).rows;},async transaction<T>(work:(db:Database)=>Promise<T>){return 'transaction'in pg?pg.transaction(tx=>work(adapter(tx))):work(adapter(pg));}};}
test('Complete Que Bros workspace',async t=>{
 const pg=new PGlite(),db=adapter(pg),store=new Store(db);try{
 for(const sql of schemaStatements)await db.query(sql);
 await db.query("INSERT INTO qb_pos.users(id,name,email,password,is_verified) VALUES('suite-owner','Que Bros Owner','owner@suite.test','unused',true),('other-owner','Other','other@suite.test','unused',true)");
 const actor=await resolveActor(db,'suite-owner'),suite=new SuiteService(db,actor);await suite.seed();let category='',brand='',unit='',supplier='',product='',purchase='',sale='',returnId='';
 await t.test('catalog categories, brands, units and parent validation',async()=>{
  category=(await suite.save('categories',undefined,{name:'Fragrances',code:'QB-FRAG'})).id;
  brand=(await suite.save('brands',undefined,{name:'Que Bros Collection',website:'https://example.test'})).id;
  unit=(await suite.save('units',undefined,{name:'Bottle',symbol:'btl'})).id;
  await assert.rejects(suite.save('categories',category,{name:'Fragrances',parent:category}),/own parent/);
  assert.equal((await suite.records('brands')).length,1);
 });
 await t.test('supplier, customer and expense persistence',async()=>{
  supplier=(await suite.save('suppliers',undefined,{name:'Fragrance Supplier',email:'supplier@suite.test',paymentTerms:'Net 30'})).id;
  await suite.save('customers',undefined,{name:'Boutique Customer',email:'customer@suite.test',tag:'VIP'});
  await suite.save('expenses',undefined,{title:'Boutique rent',category:'Facility & Rent',amount:250,date:'2026-10-22',paymentMethod:'Bank Transfer'});
  assert.equal((await suite.records('expenses'))[0].data.amount,250);
 });
 await t.test('extended product fields and catalog dependencies',async()=>{
  const p=await store.createProduct(actor.owner,{name:'Signature Parfum',sku:'QB-SIG',quantity:5,sellPrice:100,costPrice:40,category:'Fragrances',brand:'Que Bros Collection',unit:'btl',barcode:'12345678',maximumStock:100,tax:0,discount:0});product=p._id;
  const row=await store.product(actor.owner,product);assert.equal((row as Data).barcode,'12345678');
  await assert.rejects(suite.remove('categories',category),/assigned to products/);await assert.rejects(suite.remove('brands',brand),/assigned to products/);await assert.rejects(suite.remove('units',unit),/assigned to products/);
 });
 const po={supplierId:'',date:'2026-10-22',warehouse:'Que Bros Boutique',status:'received',items:[] as Data[],discount:0,shipping:5,paid:200,paymentMethod:'Bank Transfer'};
 await t.test('receive purchase and apply inbound stock exactly once',async()=>{
  po.supplierId=supplier;po.items=[{productId:product,quantity:10,cost:30,tax:10}];const result=await suite.purchase(po);purchase=result.id;assert.equal(result.total,335);assert.equal((await store.product(actor.owner,product)).quantity,15);
  await assert.rejects(suite.purchase(po,purchase),/locked/);assert.equal((await store.product(actor.owner,product)).quantity,15);
 });
 await t.test('supplier returns remove stock and cannot exceed source quantities',async()=>{
  const r=await suite.returnItems('purchase-returns',{sourceId:purchase,reason:'Damaged packaging',status:'approved',items:[{productId:product,quantity:2}]});assert.equal(r.refund,66);assert.equal((await store.product(actor.owner,product)).quantity,13);
  await assert.rejects(suite.returnItems('purchase-returns',{sourceId:purchase,reason:'Excess',status:'approved',items:[{productId:product,quantity:9}]}),/exceeds/);
 });
 await t.test('manual stock audit rejects negative stock and records actor',async()=>{
  const a=await suite.adjustment({productId:product,type:'subtraction',quantity:1,warehouse:'Que Bros Boutique',reason:'Stock Count Audit'});assert.equal(a.after,12);assert.equal(a.adjustedBy,'Que Bros Owner');
  await assert.rejects(suite.adjustment({productId:product,type:'subtraction',quantity:99,warehouse:'Que Bros Boutique',reason:'Damage'}),/negative/);
 });
 await t.test('cash checkout calculates invoice tax, discount and change on server',async()=>{
  const order=await suite.sale({customerName:'Boutique Customer',customerEmail:'customer@suite.test',items:[{productId:product,quantity:2}],discount:10,tax:12,paid:250,paymentMethod:'Cash'});sale=order._id;assert.equal(order.totalAmount,201.6);assert.equal(order.paid,201.6);assert.equal((order as Data).change,48.4);assert.equal((await store.product(actor.owner,product)).quantity,10);
  assert.equal(order.items[0].costPrice,30);
 });
 await t.test('insufficient cash rolls back the whole checkout',async()=>{
  const before=(await store.orders(actor.owner)).length;
  await assert.rejects(suite.sale({items:[{productId:product,quantity:1}],paid:1,paymentMethod:'Cash'}),/less than/);assert.equal((await store.product(actor.owner,product)).quantity,10);assert.equal((await store.orders(actor.owner)).length,before);
 });
 await t.test('pending sales returns reserve eligibility; approval restocks once',async()=>{
  const r=await suite.returnItems('sales-returns',{sourceId:sale,reason:'Wrong fragrance selected',status:'pending',restock:true,items:[{productId:product,quantity:1}]});returnId=r.id;assert.equal((await store.product(actor.owner,product)).quantity,10);
  await suite.returnItems('sales-returns',{sourceId:sale,reason:'Wrong fragrance selected',status:'approved',restock:true,items:[{productId:product,quantity:1}]},returnId);assert.equal((await store.product(actor.owner,product)).quantity,11);
  await assert.rejects(suite.returnItems('sales-returns',{sourceId:sale,reason:'Duplicate',status:'approved',items:[{productId:product,quantity:1}]},returnId),/already/);
  await assert.rejects(store.updateOrder(actor.owner,sale,'cancelled'),/approved returns/);
 });
 await t.test('invoice balances and recorded payments cannot overpay',async()=>{
  const o=await suite.sale({customerName:'Boutique Customer',customerEmail:'customer@suite.test',items:[{productId:product,quantity:1}],paid:20,paymentMethod:'Bank Transfer'});await suite.payment(o._id,{amount:80,paymentMethod:'Cash'});assert.equal((await store.orders(actor.owner,o._id))[0].paid,100);await assert.rejects(suite.payment(o._id,{amount:1,paymentMethod:'Cash'}),/exceeds/);
 });
 await t.test('settings are persisted and validated',async()=>{
  await suite.saveSettings('general',{businessName:'Que Bros Perfumery',currency:'PHP',timezone:'Asia/Manila'});await suite.saveSettings('inventory',{lowStockThreshold:7,skuPrefix:'QB-'});const settings=await suite.settings();assert.equal(settings.inventory.lowStockThreshold,7);assert.equal((await store.business(actor.owner)).currency,'PHP');await assert.rejects(suite.saveSettings('general',{timezone:'Invalid/Zone'}),/valid timezone/);
 });
 await t.test('staff roles, shared boutique scope and immediate suspension',async()=>{
  const member=await suite.saveMember({name:'Que Bros Cashier',email:'cashier@suite.test',password:'Cashier-test-password-123',roleId:`${actor.owner}-role-cashier`,warehouse:'Que Bros Boutique',active:true});
  const staff=await resolveActor(db,member.id);assert.equal(staff.owner,actor.owner);authorize(staff,'sales','create');assert.throws(()=>authorize(staff,'admin','update'),/permission/);assert.throws(()=>authorize(staff,'reports','read'),/permission/);
  const service=new SuiteService(db,staff),state=await service.state();assert.equal(state.products[0].costPrice,0);assert.equal(state.members.length,0);await assert.rejects(service.saveRole(`${actor.owner}-role-cashier`,{permissions:defaultPermissions.administrator}),/permission/);
  await suite.saveMember({name:'Que Bros Cashier',email:'cashier@suite.test',roleId:`${actor.owner}-role-cashier`,warehouse:'Que Bros Boutique',active:false},member.id);await assert.rejects(resolveActor(db,member.id),/suspended/);
 });
 await t.test('roles edits apply immediately and administrator stays fixed',async()=>{
  await suite.saveRole(`${actor.owner}-role-manager`,{permissions:{sales:['read'],inventory:['read']}});assert.equal(((await suite.find('roles',`${actor.owner}-role-manager`)).data.permissions as Data).reports instanceof Array,true);
  await assert.rejects(suite.saveRole(`${actor.owner}-role-administrator`,{permissions:{}}),/fixed/);
 });
 await t.test('other boutique cannot read or mutate these records',async()=>{
  const other=new SuiteService(db,await resolveActor(db,'other-owner'));assert.equal((await other.records('purchases')).length,0);await assert.rejects(other.find('purchases',purchase),/not found/);await assert.rejects(other.purchase({...po,supplierId:supplier}),/not found/);
 });
 await t.test('audit, dashboard data and reports are backed by saved records',async()=>{
  const state=await suite.state();assert.equal(state.sales.length,2);assert(state.audit.length>=10);assert(state.records.some(r=>r.kind==='sales-returns'));assert.equal((await store.stats(actor.owner)).totalProducts,1);
 });
 }finally{await pg.close();}
});
