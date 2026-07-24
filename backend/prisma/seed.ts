/**
 * Prisma Seed Script
 * ==================
 * Seeds the Neon database with default departments and any other
 * initial data the application requires.
 *
 * Run: npm run prisma:seed
 *      (requires DATABASE_URL or DIRECT_URL set in root .env)
 *
 * This replaces all SQL seed data that was previously in
 * supabase/migrations/full_visitor_management_schema.sql
 */

import { prisma } from "../server/lib/prisma.js";

async function main() {
  console.log("Seeding database...");

  // Default departments
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
    console.log(`  ✓ Department: ${dept.name}`);
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
