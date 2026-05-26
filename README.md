# PRANATA Backend

NestJS backend untuk aplikasi PRANATA. Backend ini menyediakan REST API untuk autentikasi, manajemen user, dinas, kegiatan, laporan, pengaturan budget, OTP, dan upload foto.

## Stack

- NestJS
- PostgreSQL
- Prisma ORM
- JWT Authentication
- Cloudinary
- EmailJS

## Setup

```bash
npm install
cp .env.example .env
```

Isi `.env` dengan konfigurasi lokal/production, terutama:

```text
DATABASE_URL=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Database

Jalankan migration dan seed awal:

```bash
npx prisma migrate deploy
npx prisma db seed
```

Seed membuat data dinas awal dan akun superadmin default.

## Run

```bash
npm run start:dev
```

Default API:

```text
http://localhost:3000/api
```
