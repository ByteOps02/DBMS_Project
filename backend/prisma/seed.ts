import "dotenv/config";
import { prisma } from "../server/lib/prisma.js";
import bcrypt from "bcryptjs";

async function main() {
  console.log("Seeding database...");

  const departments = [
    "Administration",
    "Faculty",
    "Security",
    "IT Department",
    "Facilities",
    "Hostel",
    "Library",
  ];

  for (const name of departments) {
    const dept = await prisma.department.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Department: ${dept.name}`);
  }

  const defaultUsers = [
    { email: "admin@gmail.com", password: "Admin@123", role: "admin", name: "Admin User" },
    { email: "host@gmail.com", password: "Host@123", role: "host", name: "Host User" },
    { email: "guard@gmail.com", password: "Guard@123", role: "guard", name: "Guard User" },
    { email: "visitor@gmail.com", password: "Visitor@123", role: "visitor", name: "Visitor User" },
  ] as const;

  for (const u of defaultUsers) {
    const password_hash = await bcrypt.hash(u.password, 10);
    const user = await prisma.host.upsert({
      where: { email: u.email },
      update: {
        password_hash,
        role: u.role,
        is_verified: true,
      },
      create: {
        email: u.email,
        name: u.name,
        password_hash,
        role: u.role,
        is_verified: true,
      }
    });
    console.log(`User: ${user.email} (${user.role})`);
  }

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
