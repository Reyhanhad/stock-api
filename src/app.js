const { metricsMiddleware, metricsHandler } = require("./metrics");
const express = require("express");
const { Pool } = require("pg");

const app = express();
app.use(metricsMiddleware);
app.get("/metrics", metricsHandler);

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  connectionTimeoutMillis: 3000,
});

pool.on("error", (error) => {
  console.error("Koneksi database bermasalah:", error.message);
});

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Stock API" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

app.get("/ready", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      status: "ready",
      database: "connected",
    });
  } catch (error) {
    console.error("Pemeriksaan database gagal:", error.message);

    res.status(503).json({
      status: "not_ready",
      database: "disconnected",
    });
  }
});

app.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY id"
    );

    res.json(result.rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Gagal mengambil barang" });
  }
});

app.post("/products", async (req, res) => {
  const { name, stock } = req.body ?? {};

  if (
    typeof name !== "string" ||
    name.trim().length === 0 ||
    name.trim().length > 100 ||
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 2147483647
  ) {
    return res.status(400).json({
      error: "Nama wajib 1–100 karakter dan stok harus bilangan bulat 0–2147483647",
    });
  }

  try {
    const result = await pool.query(
      "INSERT INTO products (name, stock) VALUES ($1, $2) RETURNING *",
      [name.trim(), stock]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Gagal menambahkan barang" });
  }
});

app.patch("/products/:id/stock", async (req, res) => {
  const id = Number(req.params.id);
  const { stock } = req.body ?? {};

  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    return res.status(400).json({ error: "ID tidak valid" });
  }

  if (
    !Number.isInteger(stock) ||
    stock < 0 ||
    stock > 2147483647
  ) {
    return res.status(400).json({
      error: "Stok harus bilangan bulat 0–2147483647",
    });
  }

  try {
    const result = await pool.query(
      "UPDATE products SET stock = $1 WHERE id = $2 RETURNING *",
      [stock, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Barang tidak ditemukan" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "Gagal memperbarui stok" });
  }
});

module.exports = { app, pool };