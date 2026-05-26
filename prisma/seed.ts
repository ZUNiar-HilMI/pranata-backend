import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding database...');

  // 1. Seed Dinas
  const dinasData = [
    { name: 'Dinas Komunikasi dan Informatika', code: 'DISKOMINFO', description: 'Mengelola komunikasi, informasi, persandian, dan statistik.' },
    { name: 'Dinas Pekerjaan Umum dan Penataan Ruang', code: 'DPUPR', description: 'Mengelola infrastruktur jalan, jembatan, irigasi, dan tata ruang.' },
    { name: 'Dinas Kesehatan', code: 'DINKES', description: 'Mengelola pelayanan kesehatan masyarakat dan fasilitas medis.' },
  ];

  for (const d of dinasData) {
    const dinas = await prisma.dinas.upsert({
      where: { code: d.code },
      update: {},
      create: d,
    });
    console.log(`Seeded Dinas: ${dinas.name} (${dinas.code})`);
  }

  // 2. Seed default Superadmin
  const hashedPassword = await bcrypt.hash('superadmin123', 10);
  const superadmin = await prisma.user.upsert({
    where: { email: 'superadmin@pranata.go.id' },
    update: {},
    create: {
      username: 'superadmin',
      email: 'superadmin@pranata.go.id',
      password: hashedPassword,
      fullName: 'Super Admin PRANATA',
      role: Role.SUPERADMIN,
      isEmailVerified: true,
    },
  });
  console.log(`Seeded Superadmin: ${superadmin.email}`);

  // 3. Seed default Settings
  const defaultSettings = [
    { key: 'budget_limit', value: '1000000000' }, // 1 Milyar default
  ];

  for (const s of defaultSettings) {
    const setting = await prisma.setting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
    console.log(`Seeded Setting: ${setting.key} = ${setting.value}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
