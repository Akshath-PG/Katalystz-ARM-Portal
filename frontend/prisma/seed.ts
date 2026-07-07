const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminEmail = 'admin@katalystzedu.com';
  const plainPassword = 'Password123!';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    console.log('Admin user already exists.');
    return;
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: 'Katalystz Admin',
      email: adminEmail,
      password: hashedPassword,
      role: 'KATALYST_ADMIN',
    }
  });

  console.log(`Created initial admin user: ${admin.email}`);
  console.log(`Password: ${plainPassword}`);
  console.log('PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
