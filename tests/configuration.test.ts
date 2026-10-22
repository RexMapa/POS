import { test } from 'node:test';
import assert from 'node:assert/strict';
import { databaseUrl, dbConnect } from '../lib/db/db';
import { issueSession, readSession } from '../lib/session';
import { getUserIdFromRequest } from '../lib/auth';
import { route } from '../lib/api';
import { NextResponse } from 'next/server';
import { reportDates } from '../lib/validation';
test('configuration, session security and request validation',async t=>{
 const saved={db:process.env.DATABASE_URL,pg:process.env.POSTGRES_URL,jwt:process.env.JWT_SECRET};
 try {
  delete process.env.DATABASE_URL;delete process.env.POSTGRES_URL;
  await t.test('safe import; missing database rejected at connection time',async()=>{assert.throws(databaseUrl,/DATABASE_URL/);await assert.rejects(dbConnect(),/DATABASE_URL/);});
  await t.test('reject MongoDB URLs and require encrypted remote PostgreSQL',()=>{
   process.env.DATABASE_URL='mongodb://localhost/test';assert.throws(databaseUrl,/postgres/);
   process.env.DATABASE_URL='postgresql://user:password@remote.example.test/db';assert.throws(databaseUrl,/sslmode/);
   process.env.DATABASE_URL='postgresql://user:password@remote.example.test/db?sslmode=require';assert.equal(databaseUrl(),process.env.DATABASE_URL);
  });
  await t.test('reject weak/missing session secrets',async()=>{process.env.JWT_SECRET='';await assert.rejects(issueSession('owner'),/32 characters/);process.env.JWT_SECRET='short';await assert.rejects(issueSession('owner'),/32 characters/);});
  await t.test('signed session round-trip; tampering and absent cookies rejected',async()=>{
   process.env.JWT_SECRET='test-only-long-secret-at-least-32-characters';
   const token=await issueSession('owner');assert.equal(await readSession(token),'owner');
   await assert.rejects(readSession(token.slice(0,-6)+'abcdef'));
   assert.equal(await getUserIdFromRequest(new Request('http://localhost',{headers:{cookie:`token=${token}`}})),'owner');
   await assert.rejects(getUserIdFromRequest(new Request('http://localhost')),/Authentication required/);
  });
  await t.test('cross-origin mutations rejected before database access',async()=>{
   const response=await route(new Request('https://pos.example.test/api/products',{method:'POST',headers:{origin:'https://other.example.test'}}),async()=>NextResponse.json({ok:true}));assert.equal(response.status,403);
  });
  await t.test('invalid and reversed report dates rejected',()=>{assert.throws(()=>reportDates(new URL('https://example.test?startDate=bad')),/Invalid date/);assert.throws(()=>reportDates(new URL('https://example.test?startDate=2026-10-22&endDate=2025-01-01')),/Invalid date/);});
 } finally {for(const [key,value] of Object.entries({DATABASE_URL:saved.db,POSTGRES_URL:saved.pg,JWT_SECRET:saved.jwt})) {if(value===undefined) delete process.env[key];else process.env[key]=value;}}
});
