# Stock API — Docker Compose Project

REST API pengelolaan stok sederhana menggunakan Node.js, Express,
dan PostgreSQL. Aplikasi dan database berjalan dalam container
terpisah menggunakan Docker Compose.

## Tujuan

Mempraktikkan containerisasi aplikasi, jaringan antarcontainer,
konfigurasi environment, healthcheck database, dan penyimpanan persisten.

## Teknologi

- Node.js 24
- Express
- PostgreSQL 17
- Docker dan Docker Compose

## Arsitektur

- Client mengakses API melalui `localhost:3001`.
- Port 3001 pada host diteruskan ke port 3000 dalam container API.
- API mengakses PostgreSQL melalui `db:5432` di jaringan Compose.
- PostgreSQL menyimpan data pada named volume `postgres_data`.
- PostgreSQL juga tersedia melalui `localhost:5433` untuk pengembangan lokal.

## Menjalankan Proyek

Prasyarat: Docker Engine dan Docker Compose tersedia serta daemon Docker berjalan.
Port 3001 dan 5433 harus tersedia.

Dari folder proyek:

```bash
cp .env.example .env
```

Sesuaikan password pada `.env` sebelum menjalankan database pertama kali.

```bash
docker compose up -d --build
docker compose ps
```

Tidak perlu memasang Node.js atau PostgreSQL di host untuk menjalankan
proyek melalui Docker Compose.

Pada database baru, tabel `products` dibuat otomatis dari
`db/init/001-create-products.sql`. Script inisialisasi hanya berjalan
ketika direktori data PostgreSQL masih kosong.

## Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/` | Informasi aplikasi |
| GET | `/health` | Memeriksa proses API |
| GET | `/ready` | Memeriksa koneksi database |
| GET | `/products` | Melihat daftar barang |
| POST | `/products` | Menambahkan barang |
| PATCH | `/products/:id/stock` | Mengganti jumlah stok barang |

## Contoh Penggunaan

Memeriksa kesiapan aplikasi:

```bash
curl -i http://localhost:3001/ready
```

Menambahkan barang:

```bash
curl -i -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Buku Tulis","stock":20}'
```

Melihat daftar barang:

```bash
curl http://localhost:3001/products
```

Mengganti stok menjadi 15.
Ganti ID `1` dengan ID dari respons penambahan barang:

```bash
curl -i -X PATCH http://localhost:3001/products/1/stock \
  -H "Content-Type: application/json" \
  -d '{"stock":15}'
```

Menguji penolakan stok negatif; respons yang diharapkan adalah HTTP 400:

```bash
curl -i -X POST http://localhost:3001/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Barang Invalid","stock":-1}'
```

## Deployment dari GHCR

Image dipublikasikan oleh GitHub Actions setelah test dan build berhasil
pada push ke branch main. Tag image menggunakan SHA commit lengkap.

Isi `IMAGE_TAG` di `.env` dengan SHA commit yang sudah dipublikasikan, lalu:

```bash
docker compose -f compose.yaml -f compose.deploy.yaml pull api
docker compose -f compose.yaml -f compose.deploy.yaml up -d --no-build api
```

Periksa hasil deployment:

```bash
curl -i http://localhost:3001/ready
curl http://localhost:3001/products
```

Untuk kembali membangun dan menjalankan kode lokal:

```bash
docker compose up -d --build api
```

## Pengujian Manual yang Sudah Dilakukan

- Koneksi API ke PostgreSQL menghasilkan HTTP 200 pada `/ready`.
- Data barang berhasil ditambahkan dan ditampilkan.
- Perubahan stok berhasil dengan HTTP 200.
- Input stok negatif ditolak dengan HTTP 400.
- Data tetap tersedia setelah `docker compose down` dan `up`.
- Tabel terbentuk otomatis pada volume database baru.

## Operasional

Melihat log:

```bash
docker compose logs --tail=50 api db
```

Menghentikan dan menghapus container serta network proyek:

```bash
docker compose down
```

Named volume tetap disimpan. Opsi `docker compose down -v`
akan menghapus volume beserta data database.

## Catatan Konfigurasi

- `.env` diabaikan oleh Git dan tidak dimasukkan ke image.
- `.env.example` menyediakan contoh konfigurasi.
- API berjalan sebagai pengguna non-root di container.
- Query menggunakan parameter SQL untuk input pengguna.
- API menunggu healthcheck database berhasil sebelum dimulai.
- Mengubah kredensial pada `.env` tidak otomatis mengubah kredensial
  database yang sudah diinisialisasi pada volume lama.

## Batasan

Proyek ini adalah lab lokal. Belum mencakup autentikasi,
HTTPS, pipeline CI/CD, backup otomatis, atau deployment cloud.
