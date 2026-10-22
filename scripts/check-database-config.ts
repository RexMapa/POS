import assert from "node:assert/strict";

const original = process.env.MONGODB_URI;
try {
  delete process.env.MONGODB_URI;
  // Importing a route dependency must succeed without runtime credentials.
  const { dbConnect } = await import("../lib/db/db");
  await assert.rejects(dbConnect(), /Database is not configured/);
  process.env.MONGODB_URI = "   ";
  await assert.rejects(dbConnect(), /Database is not configured/);
  process.env.MONGODB_URI = "https://invalid.example.test";
  await assert.rejects(dbConnect(), /must start with/);
  console.log("PASS: safe import without MongoDB credentials; missing, blank and invalid configuration rejected at connection time.");
} finally {
  if (original === undefined) delete process.env.MONGODB_URI;
  else process.env.MONGODB_URI = original;
}
