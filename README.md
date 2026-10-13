# Satelyd Backend (satelyd-be)

Backend API untuk platform **Satelyd** berbasis **NestJS**, **Prisma ORM**, dan **PostgreSQL**.

---

## 1. Persyaratan Sistem

- **Node.js**: v20.x atau v22.x LTS
- **npm**: v10+
- **Database**: PostgreSQL 15+ (bisa menggunakan Docker, Supabase, Railway, atau PostgreSQL lokal)

---

## 2. Langkah Instalasi

1. **Clone repository & masuk ke direktori backend**:
   ```bash
   cd satelyd-be
   ```

2. **Install dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Salin file contoh konfigurasi:
   ```bash
   cp .env.example .env
   ```
   Sesuaikan nilai variabel di `.env`, terutama `DATABASE_URL`, `DIRECT_URL`, dan `JWT_SECRET`.

4. **Generate Prisma Client & Migrasi Database**:
   ```bash
   npx prisma generate
   npx prisma migrate deploy
   ```
   *(Opsional)* Jalankan database seeder jika diperlukan:
   ```bash
   npm run prisma:seed
   ```

---

## 3. Build Proyek

Untuk mengompilasi TypeScript ke JavaScript (folder `dist/`):

```bash
npm run build
```

---

## 4. Cara Menjalankan Aplikasi

### Mode Development
```bash
npm run start:dev
```
Aplikasi akan berjalan di `http://localhost:4000` (atau port sesuai konfigurasi `PORT`).

### Mode Production
Setelah proses build selesai (`npm run build`):
```bash
npm run start:prod
```

### Dokumentasi API (Swagger)
Swagger UI tersedia secara otomatis di:
```text
http://localhost:4000/api/docs
```
