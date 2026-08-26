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

  // --- SEED INDIAN STUDENTS ---
  console.log("Seeding Indian students dataset for Hostel Block A (10 Floors)...");

  // Clean old student data first
  await prisma.studentMovement.deleteMany({});
  await prisma.hostelLeave.deleteMany({});
  await prisma.student.deleteMany({});

  const girlNames = [
    "Aditi", "Ananya", "Anushka", "Bhavya", "Divya", "Jaya", "Khushi", 
    "Meera", "Neha", "Pooja", "Priya", "Riya", "Sakshi", "Sanika", 
    "Shreya", "Sneha", "Vaishnavi", "Zoya", "Ritika", "Tanvi"
  ];

  const boyNames = [
    "Aarav", "Aditya", "Akash", "Aniket", "Aryan", "Ayush", "Chetan", "Dev", 
    "Gaurav", "Harsh", "Ishaan", "Kartik", "Kunal", "Manish", "Mohit", "Nikhil", 
    "Pranav", "Rahul", "Rohan", "Sameer", "Sarthak", "Siddharth", "Tanmay", 
    "Utkarsh", "Varun", "Vedant", "Vikas", "Yash", "Abhishek", "Rishabh"
  ];

  const lastNames = [
    "Sharma", "Verma", "Patil", "Deshmukh", "Gupta", "Singh", "Kumar", "Mishra", 
    "Joshi", "Kulkarni", "Choudhary", "Reddy", "Nair", "Iyer", "Banerjee", "Chatterjee", 
    "Agarwal", "Bhatia", "Mehta", "Shah", "Pandey", "Tiwari", "Yadav", "Rao", 
    "Saxena", "Bose", "Ghosh", "Jadhav", "Shinde", "Pawar"
  ];

  const branchConfigs = [
    { code: "CSE", name: "Computer Science & Engg" },
    { code: "CSA", name: "AI & Machine Learning (CSA)" },
    { code: "ECE", name: "Electronics & Comm. Engg" },
    { code: "HCI", name: "Human-Computer Interaction (HCI)" },
  ];

  // Current academic batch mappings:
  // BT23 = 4th Year (Passing 2027, Floors 9 & 10)
  // BT24 = 3rd Year (Passing 2028, Floors 6, 7 & 8)
  // BT25 = 2nd Year (Passing 2029, Floors 4 & 5)
  // BT26 = 1st Year (Passing 2030, Floors 2 & 3)
  const batchYearPrefixes: Record<number, string> = {
    1: "26",
    2: "25",
    3: "24",
    4: "23",
  };

  const studentsData = [];

  // 1. Explicitly seed the user's roll number BT23CSE026 (4th Year, 9th Floor Room 926)
  studentsData.push({
    roll_number: "BT23CSE026",
    name: "Ram Krishna",
    email: "bt23cse026@iiitn.ac.in",
    phone: "9823456789",
    hostel_block: "Hostel Block A",
    room_number: "926",
    branch: "Computer Science & Engg",
    year: 4,
    parent_name: "Krishna Family",
    parent_phone: "919876543210",
    status: "inside"
  });

  for (let i = 1; i <= 60; i++) {
    const isGirl = i % 4 === 0; // ~25% girls
    const fn = isGirl 
      ? girlNames[(i / 4) % girlNames.length] 
      : boyNames[i % boyNames.length];
    const ln = lastNames[(i * 3) % lastNames.length];
    const name = `${fn} ${ln}`;
    const year = (i % 4) + 1; // 1, 2, 3, 4
    const yearPrefix = batchYearPrefixes[year];
    const branchObj = branchConfigs[i % branchConfigs.length];
    const roll_number = `BT${yearPrefix}${branchObj.code}${String(i).padStart(3, "0")}`;
    
    // Skip if already explicitly added
    if (roll_number === "BT23CSE026") continue;

    const email = `${roll_number.toLowerCase()}@iiitn.ac.in`;
    const hostel_block = "Hostel Block A";
    
    // Room Number assignment according to floor allocation rules
    let room_number = "101";
    const roomOffset = ((i * 3) % 53) + 1; // 1 to 53
    const formattedOffset = String(roomOffset).padStart(2, "0");

    if (isGirl) {
      // 1st Floor: 101 to 153 (Girls of all years)
      room_number = `1${formattedOffset}`;
    } else {
      // Boys according to year
      if (year === 1) {
        // 1st Year (BT26): 2nd & 3rd Floor (201-253, 301-353)
        const floor = i % 2 === 0 ? 2 : 3;
        room_number = `${floor}${formattedOffset}`;
      } else if (year === 2) {
        // 2nd Year (BT25): 4th & 5th Floor (401-453, 501-553)
        const floor = i % 2 === 0 ? 4 : 5;
        room_number = `${floor}${formattedOffset}`;
      } else if (year === 3) {
        // 3rd Year (BT24): 6th, 7th & 8th Floor (601-653, 701-753, 801-853)
        const floor = 6 + (i % 3);
        room_number = `${floor}${formattedOffset}`;
      } else {
        // 4th Year (BT23): 9th & 10th Floor (901-953, 1001-1053)
        const floor = i % 2 === 0 ? 9 : 10;
        room_number = `${floor}${formattedOffset}`;
      }
    }

    const branch = branchObj.name;
    const phone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
    const parent_name = `${lastNames[(i * 2) % lastNames.length]} Family`;
    const parent_phone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;

    // Status distribution: 40 inside, 12 out_day, 6 on_leave, 2 overdue
    let status = "inside";
    if (i % 8 === 0) status = "on_leave";
    else if (i % 4 === 0) status = "out_day";

    studentsData.push({
      roll_number,
      name,
      email,
      phone,
      hostel_block,
      room_number,
      branch,
      year,
      parent_name,
      parent_phone,
      status
    });
  }




  for (const s of studentsData) {
    const student = await prisma.student.upsert({
      where: { roll_number: s.roll_number },
      update: s,
      create: s
    });

    // Create sample movements / leaves
    if (s.status === "out_day") {
      const isLate = Math.random() > 0.7;
      const exitTime = new Date(Date.now() - (isLate ? 6 : 2) * 60 * 60 * 1000);
      const expectedIn = new Date(Date.now() + (isLate ? -1 : 3) * 60 * 60 * 1000);

      await prisma.studentMovement.create({
        data: {
          student_id: student.id,
          movement_type: "day_outing",
          exit_time: exitTime,
          exit_gate: "Main Gate",
          expected_in: expectedIn,
          purpose: "Market / Dinner",
          is_overdue: isLate
        }
      });
    } else if (s.status === "on_leave") {
      const fromDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
      const toDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

      const leave = await prisma.hostelLeave.create({
        data: {
          student_id: student.id,
          leave_type: "vacation",
          from_date: fromDate,
          to_date: toDate,
          destination: "Home Visit (Nagpur / Mumbai / Pune)",
          reason: "Family Function / Semester Break",
          status: "approved",
          approved_by: "Hostel Warden Office",
          approved_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        }
      });

      await prisma.studentMovement.create({
        data: {
          student_id: student.id,
          movement_type: "hostel_leave",
          exit_time: fromDate,
          exit_gate: "Main Gate",
          expected_in: toDate,
          leave_id: leave.id,
          purpose: "Approved Vacation Leave"
        }
      });
    }
  }

  // Create a few pending leave requests for the Warden to review
  const pendingStudents = await prisma.student.findMany({
    where: { status: "inside" },
    take: 4
  });

  for (const ps of pendingStudents) {
    await prisma.hostelLeave.create({
      data: {
        student_id: ps.id,
        leave_type: "home_visit",
        from_date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        to_date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
        destination: "Bhopal / Indore / Hyderabad",
        reason: "Attending sister's wedding ceremony",
        status: "pending"
      }
    });
  }

  console.log(`Seeded ${studentsData.length} Indian students with movements and leaves.`);
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
