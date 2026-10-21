const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { randomUUID } = require("node:crypto");
const request = require("supertest");

// Tolak pengujian jika konfigurasi menunjuk database aplikasi.
if (process.env.POSTGRES_DB !== "stockdb_test") {
  throw new Error("Integration test hanya boleh memakai stockdb_test");
}

const { app, pool } = require("../src/app");
const productName = `integration-${randomUUID()}`;

before(async () => {
  const result = await pool.query("SELECT current_database() AS name");
  assert.equal(result.rows[0].name, "stockdb_test");

  const sql = readFileSync(
    join(__dirname, "../db/init/001-create-products.sql"),
    "utf8"
  );

  await pool.query(sql);
});

after(async () => {
  await pool.end();
});

test("Barang bisa ditambah, dibaca, dan diubah di PostgreSQL", async () => {
  try {
    // Tambahkan barang melalui API.
    const created = await request(app)
      .post("/products")
      .send({ name: productName, stock: 20 });

    assert.equal(created.status, 201);
    assert.equal(created.body.name, productName);
    assert.equal(created.body.stock, 20);
    assert.ok(Number.isInteger(created.body.id));

    const id = created.body.id;

    // Pastikan barang muncul di daftar.
    const listed = await request(app).get("/products");

    assert.equal(listed.status, 200);

    const product = listed.body.find((item) => item.id === id);
    assert.ok(product, "Barang harus muncul di daftar");
    assert.equal(product.stock, 20);

    // Ubah stok melalui API.
    const updated = await request(app)
      .patch(`/products/${id}/stock`)
      .send({ stock: 15 });

    assert.equal(updated.status, 200);
    assert.equal(updated.body.stock, 15);

    // Periksa langsung bahwa perubahan tersimpan di database.
    const stored = await pool.query(
      "SELECT stock FROM products WHERE id = $1",
      [id]
    );

    assert.equal(stored.rows[0].stock, 15);
  } finally {
    // Bersihkan hanya barang yang dibuat oleh pengujian ini.
    await pool.query(
      "DELETE FROM products WHERE name = $1",
      [productName]
    );
  }
});