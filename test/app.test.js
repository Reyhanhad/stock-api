const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const { app, pool } = require("../src/app");

after(async () => {
  await pool.end();
});

test("GET /health mengembalikan status ok", async () => {
  const response = await request(app).get("/health");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "ok" });
});

test("POST /products menolak stok negatif", async () => {
  const response = await request(app)
    .post("/products")
    .send({
      name: "Buku Tulis",
      stock: -1,
    });

  assert.equal(response.status, 400);
  assert.equal(typeof response.body.error, "string");
});