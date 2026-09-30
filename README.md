# Wedding Catalog API (Vercel Serverless + DriveMyAdmin)

Backend REST API untuk Wedding Catalog yang telah dimigrasi dari Laravel menjadi **Node.js Express Serverless**, dioptimalkan untuk hosting gratis di **Vercel** dengan database dan penyimpanan cloud menggunakan **DriveMyAdmin**.

---

## Fitur Utama

- **Hosting di Vercel (100% Gratis & Serverless)**:
  - Dikonfigurasi dengan `vercel.json` dan handler serverless `api/index.js`.
  - Zero-maintenance, instant scaling.
- **Database & Object Storage via DriveMyAdmin**:
  - Terintegrasi dengan SDK `lib/drivemyadmin.ts` / `src/lib/drivemyadmin.js`.
  - Terkoneksi ke database `wedding_catalog`.
  - Upload file thumbnail otomatis ke DriveMyAdmin Object Storage CDN.
- **100% Kompatibel dengan Frontend (`wedding-catalog-web`)**:
  - Response format, status code, error payload, dan pagination persis sama dengan Laravel API.
  - Autentikasi Admin via Bearer JWT token (kompatibel penuh dengan `auth:sanctum`).
  - Hashing password menggunakan `bcryptjs` (kompatibel penuh dengan hash Laravel).

---

## Endpoint API

### Public
- `GET /api/designs` - Katalog desain (filter: `category`, `tag`, `search`, `price_type`, `featured`, pagination)
- `GET /api/designs/:slug` - Detail desain berdasarkan slug
- `POST /api/designs/:slug/view` - Increment jumlah view desain
- `GET /api/categories` - Daftar kategori beserta `designs_count`
- `GET /api/tags` - Daftar tag beserta `designs_count`

### Auth Admin
- `POST /api/admin/login` - Login admin (`email`, `password`) -> return `{ admin, token }`
- `POST /api/admin/logout` - Logout (membutuhkan Bearer token)
- `GET /api/admin/me` - Cek profil admin login

### CRUD Admin (Membutuhkan Bearer Token)
- `GET /api/admin/designs` - Daftar semua desain untuk admin (termasuk inactive)
- `GET /api/admin/designs/:id` - Detail desain berdasarkan ID
- `POST /api/admin/designs` - Tambah desain baru
- `PUT /api/admin/designs/:id` - Update data desain
- `DELETE /api/admin/designs/:id` - Hapus desain
- `POST /api/admin/categories` - Tambah kategori baru
- `PUT /api/admin/categories/:id` - Update kategori
- `DELETE /api/admin/categories/:id` - Hapus kategori
- `POST /api/admin/tags` - Tambah tag baru
- `PUT /api/admin/tags/:id` - Update tag
- `DELETE /api/admin/tags/:id` - Hapus tag
- `POST /api/admin/upload` - Upload thumbnail gambar ke DriveMyAdmin Object Storage

---

## Menjalankan Secara Lokal

1. Pastikan dependensi telah terinstal:
   ```bash
   npm install
   ```

2. Konfigurasi file `.env`:
   ```env
   DRIVEMYADMIN_URL=https://drivemyadmin.ardana629.my.id
   DRIVEMYADMIN_API_KEY=drive_admin_secret_key_2026
   DRIVEMYADMIN_DB_ID=1mjQnrbaY--W-1YG1pmWEefgNFoVXvSOC
   JWT_SECRET=wedding_catalog_secret_token_key_2026
   PORT=8000
   ```

3. Jalankan migrasi / seed awal:
   ```bash
   npm run seed
   ```

4. Jalankan server lokal:
   ```bash
   npm run dev
   ```
   Server akan berjalan di `http://127.0.0.1:8000`. Frontend Next.js `wedding-catalog-web` dapat langsung terhubung tanpa mengubah konfigurasi apa pun.

---

## Deploy ke Vercel

1. Push repository ini ke GitHub.
2. Buka dashboard [Vercel](https://vercel.com/) dan import repository.
3. Masukkan Environment Variables di Vercel:
   - `DRIVEMYADMIN_URL`: `https://drivemyadmin.ardana629.my.id`
   - `DRIVEMYADMIN_API_KEY`: `drive_admin_secret_key_2026`
   - `DRIVEMYADMIN_DB_ID`: `1mjQnrbaY--W-1YG1pmWEefgNFoVXvSOC`
   - `JWT_SECRET`: `wedding_catalog_secret_token_key_2026`
4. Klik **Deploy**!
5. Pada project frontend Next.js (`wedding-catalog-web`), cukup ubah `NEXT_PUBLIC_API_URL` ke domain Vercel yang diberikan (contoh: `https://wedding-catalog-api.vercel.app`).
