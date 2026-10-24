const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Override in the hosting environment to avoid the default credentials.
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@katalystzedu.com';
  const plainPassword = process.env.ADMIN_PASSWORD || 'Password123!';

  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  });

  if (existingAdmin) {
    // Set ADMIN_RESET_PASSWORD=true for one deploy to recover a lost admin password.
    if (process.env.ADMIN_RESET_PASSWORD === 'true') {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { password: await bcrypt.hash(plainPassword, 10) }
      });
      console.log(`Admin password reset for ${adminEmail}.`);
    } else {
      console.log('Admin user already exists.');
    }
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
  if (!process.env.ADMIN_PASSWORD) {
    console.log(`Password: ${plainPassword}`);
    console.log('PLEASE CHANGE THIS PASSWORD IMMEDIATELY AFTER LOGIN.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
