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

## CI dan Deployment

GitHub Actions menjalankan test, membangun image, lalu memublikasikannya
ke GHCR pada push ke branch main. Image diberi tag SHA commit lengkap.
Test yang gagal menghentikan proses build.

Deployment dipicu manual melalui job Jenkins
`stock-api-deploy-pipeline`, dengan parameter `DEPLOY_SHA`.

Pipeline memiliki tiga stage:
1. Validate SHA: memeriksa format SHA.
2. Deploy: mengunduh image, memperbarui container, dan memeriksa /ready.
3. Verify running image: memastikan tag container sesuai SHA pilihan.

Jenkins controller berjalan dalam container. Agent `local-deploy`
berjalan di laptop menggunakan Java 21 dan mengakses Docker lokal.
Agent harus online agar deployment dapat berjalan.

Rollback aplikasi dilakukan dengan menjalankan job menggunakan SHA
image lama yang sudah berhasil dipublikasikan. Rollback ini tidak
mengembalikan data atau struktur database.

Deployment masih menggunakan script, konfigurasi Compose, dan .env
di /home/kirko/projects/stock-api. Jenkinsfile diambil dari branch main,
sedangkan file deployment lokal belum disinkronkan otomatis oleh job.

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

## Monitoring dan Notifikasi

Stock API menggunakan Prometheus untuk mengumpulkan metrik, Grafana
untuk visualisasi, dan Alertmanager untuk mengirim notifikasi melalui Gmail.

| Komponen | Alamat lokal | Fungsi |
|---|---|---|
| Stock API | http://localhost:3001 | API aplikasi |
| Prometheus | http://localhost:9090 | Metrik dan evaluasi aturan alert |
| Grafana | http://localhost:3002 | Dashboard monitoring |
| Alertmanager | http://localhost:9093 | Pengelolaan dan pengiriman alert |

### Menjalankan stack

Pastikan `.env` sudah diisi, termasuk `IMAGE_TAG` yang tersedia di GHCR.

Untuk notifikasi Gmail:
1. Aktifkan Verifikasi 2 Langkah dan buat Google App Password.
2. Simpan App Password di `~/.config/stock-api/gmail_app_password`.
3. Gunakan permission `700` pada folder tersebut dan `444` pada file.
   Folder membatasi akses lokal, sedangkan file dipasang read-only
   agar proses Alertmanager dapat membacanya.
4. Sesuaikan `smtp_from`, `smtp_auth_username`, dan alamat penerima
   pada `monitoring/alertmanager.yml`.

App Password disimpan di luar repository.

Jalankan dari direktori proyek:

```bash
docker compose \
  -f compose.yaml \
  -f compose.deploy.yaml \
  -f compose.monitoring.yaml \
  up -d --no-build db api prometheus grafana alertmanager
```

### Dashboard Grafana

Dashboard `Stock API Monitoring` tersedia melalui provisioning
di folder `Stock API`, dengan panel:

- Status scrape API.
- Jumlah request per detik.
- Latensi request persentil ke-95.
- Persentase respons HTTP 4xx dan 5xx.
- Penggunaan memori proses API.

Metrik HTTP memerlukan traffic aplikasi. Saat tidak ada request,
sebagian panel dapat menampilkan `No data`.

### Aturan alert

`StockAPIScrapeDown` aktif ketika:

```promql
up{job="stock-api"} == 0
```

Kondisi harus bertahan selama satu menit sebelum status menjadi
`Firing`. Alertmanager mengirim email gangguan dan email pemulihan.

Alert ini memeriksa keterjangkauan endpoint `/metrics`.
Kesiapan koneksi database diperiksa secara terpisah melalui `/ready`.

### Pengujian gangguan dan pemulihan

1. Pastikan API berjalan dan alert berstatus `Inactive`.
2. Jalankan `docker compose stop api`.
3. Tunggu sekitar dua menit, lalu periksa:
   - Prometheus: alert berubah menjadi `Firing`.
   - Alertmanager: `StockAPIScrapeDown` muncul.
   - Gmail: email gangguan diterima.
4. Jalankan `docker compose start api`.
5. Tunggu sekitar satu sampai dua menit, lalu periksa:
   - Alert kembali `Inactive` di Prometheus.
   - Alert aktif hilang dari Alertmanager.
   - Gmail menerima email pemulihan.
6. Periksa kesiapan API:

```bash
curl -fsS http://localhost:3001/ready
```

Pengujian gangguan dan pemulihan telah berhasil dilakukan,
termasuk penerimaan kedua email.

### Batasan

Seluruh komponen berjalan pada satu laptop. Ketika laptop atau
Docker daemon mati total, monitoring ikut berhenti dan tidak dapat
mengirim peringatan.

Penerimaan email juga bergantung pada koneksi internet dan layanan SMTP.

### Pengujian setelah reboot
- Kelima service menyala otomatis tanpa menjalankan `compose up` atau `start`.
- PostgreSQL berstatus healthy.
- Endpoint `/ready` mengembalikan `{"status":"ready","database":"connected"}`.
