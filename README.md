# IIIT Nagpur Visitor Management System (VMS)

A web-based campus access and security management system designed for the Indian Institute of Information Technology, Nagpur. It unifies visitor registration, hostel resident outing passes with night curfew tracking, optical gate QR verification, 10-floor hostel census, vehicle parking passes, and automated email notifications.

---

## Overview & Architecture

The system is built as a modular client-server application:
- **Frontend SPA**: React with Vite, Tailwind CSS, TypeScript, and Progressive Web App (PWA) offline support.
- **Backend REST API**: Node.js and Express with TypeScript, Prisma ORM, and PostgreSQL.
- **Authentication**: JWT-based stateless authorization with bcrypt password hashing, Google OAuth2, and 6-digit email OTP verification.
- **Email Service**: Resend API integration with responsive HTML templates for passes, check-in receipts, and status updates.

```
+-------------------------------------------------------------------------+
|                        IIIT Nagpur VMS Platform                         |
+------------------------------------+------------------------------------+
                                     |
         +---------------------------+---------------------------+
         |                           |                           |
+--------v-------+          +--------v-------+          +--------v-------+
|  Hostel Hub    |          | Student Pass   |          | Reception      |
|  10-Floor Room |          | 09:30 Curfew   |          | Kiosk (Walk-in)|
|  Census Matrix |          | Leave / Outing |          | Photo Badges   |
+--------+-------+          +--------+-------+          +--------+-------+
         |                           |                           |
         +---------------------------+---------------------------+
                                     |
                            +--------v-------+
                            | Gate Optical   |
                            | QR Scanner     |
                            | 4 Checkpoints  |
                            +----------------+
```

---

## User Roles & Permissions

The platform enforces Role-Based Access Control (RBAC) across 6 distinct user accounts:

| Role | Primary Functions | Scoped Access |
| :--- | :--- | :--- |
| **Admin** | Full system configuration, user role management, campus-wide logs, blacklist management, capacity telemetry. | Campus-wide (All records) |
| **Chief Warden** | Hostel Block A 10-floor census, leave and day outing approvals, night curfew roll-call audits. | Campus-wide (Hostel & Visits) |
| **Faculty / Host** | Pre-register and pre-approve invited visitors, track department-specific visitor logs. | Department only (`host_id = user.id`) |
| **Security Guard** | Gate QR scanner for visitors and students, vehicle license plate lookup, manual check-in/out. | Checkpoint operations |
| **Student** | Digital gatepass ID card, day outing requests (09:30 PM curfew), multi-day leaves, extension requests. | Personal account only |
| **Visitor** | Submit self-requests for campus visits, view personal QR passes, and check approval status. | Personal visits only |

---

## Core Workflows

### 1. Visitor Lifecycle

1. **Invitation / Request**:
   - **Invited by Staff**: Faculty/Host/Admin enters visitor details. The visit is automatically **pre-approved**, and an active QR code pass is emailed to the visitor immediately.
   - **Public Self-Request (`/request-visit`)**: External guests submit a request from home, which enters `pending` status until reviewed by the host.
2. **Gate Arrival & Scanning**:
   - The security guard scans the visitor's QR code at the checkpoint using `/app/scan`.
   - The system validates date/time validity, blacklist status, and records the `check_in_time` and `entry_gate`.
   - An automated **Check-In Confirmation Email** is sent to the visitor.
3. **Departure**:
   - Upon exit, scanning the pass records `check_out_time` and `exit_gate`, closing the pass and sending a **Departure Confirmation Email**.

### 2. Student Pass & Curfew System

- **Day Outing**:
  - Resident students apply for a day outing via `/app/student-pass`.
  - The return curfew is set to **09:30 PM (21:30 IST)**.
  - Returning after 09:30 PM without an approved extension is automatically logged as a late return and adds a strike to the student's disciplinary record (3-strike rule).
- **Multi-Day Leave**:
  - For Vacation, Medical, or Academic leaves spanning multiple days.
  - Requires parent verification details and Chief Warden approval.
- **Curfew Extension**:
  - Students can request a 30–60 minute extension before curfew expiry for urgent academic or travel needs.

### 3. Self-Service Kiosk (`/kiosk`)

- Designed for touchscreen tablets placed at the main gate reception desk.
- Walk-in visitors select from 4 categories:
  1. **General Visitor** (Faculty meetings, campus tours)
  2. **Courier & Delivery** (Amazon, Swiggy, Zomato parcel drops)
  3. **Job Candidate** (Placement drives, recruitment interviews)
  4. **VIP Dignitary** (Official government & institutional guests)
- Includes live webcam badge photo capture (with upload fallback) and generates an instant printable thermal pass token.

### 4. Gate Optical Scanner (`/app/scan`)

- Supports both camera scanning and hardware 2D barcode/QR scanners.
- Toggle between **Student Gate Kiosk** and **Visitor Pass Scanner**.
- Standardized across 4 campus checkpoints:
  1. `Main Gate (Academic)`
  2. `Hostel Main Gate`
  3. `North Boundary Gate`
  4. `South Gate`
- Includes real-time vehicle license plate lookup.

---

## Key Features

- **Hostel Hub (Block A Census)**: Interactive 10-floor room grid tracking 400+ hostel residents in real time (`Inside`, `Out on Pass`, `On Leave`, `Overdue`).
- **Live Campus Telemetry**: Real-time occupancy gauge against the campus safe limit (1,000 headcount) with a 24-hour gate sensor traffic histogram.
- **Security Overstay Radar**: Automatically detects active visitors on campus exceeding their scheduled pass duration and provides one-click escort officer dispatch.
- **Security Blacklist**: Guards and Admins can blacklist individuals by name, email, or phone. Any future registration or gate scan immediately raises a visual and audible alarm.
- **Broadcast SOS Beacon**: Emergency alert system displaying high-priority banners, sound chimes, and live safety check-in counts.
- **Lost & Found Tracker**: Digital custody registry with 4-digit verification PINs for secure claim handovers.
- **Bulk CSV Upload**: Import hundreds of visitor passes simultaneously for conferences, workshops, or placement drives.

---

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Authenticate with email/password
- `POST /api/auth/signup` - Register a new account with role & department
- `POST /api/auth/google` - Google OAuth2 authentication
- `POST /api/auth/verify-otp` - Verify 6-digit email OTP
- `POST /api/auth/forgot-password` - Request password reset OTP
- `POST /api/auth/reset-password` - Reset password with verified OTP

### Visits (`/api/visits`)
- `GET /api/visits` - List visits (filtered by role scope, status, dates, search)
- `POST /api/visits` - Create single visit pass (auto-approved if created by staff)
- `POST /api/visits/bulk` - Batch upload visits via CSV
- `POST /api/visits/self-service-kiosk` - Walk-in kiosk registration with thermal badge
- `GET /api/visits/analytics/traffic-telemetry` - Live census, capacity meter, and 24h traffic
- `GET /api/visits/:id` - Fetch visit details
- `PATCH /api/visits/:id` - Update status, check-in, check-out, or exit gate
- `PATCH /api/visits/:id/escort` - Dispatch security escort for overstayed visitor

### Students & Movements (`/api/students`)
- `GET /api/students` - List student records and current status
- `POST /api/students/scan` - Process student gatepass QR scan (entry/exit)
- `POST /api/students/passes` - Apply for Day Outing or Multi-Day Leave
- `PATCH /api/students/passes/:id` - Approve or reject student leave pass
- `POST /api/students/curfew-extension` - Request curfew extension
- `GET /api/students/hostel-census` - 10-floor room census data for Hostel Block A

---

## Database Schema

The application uses PostgreSQL with Prisma ORM. Key models include:

- **`User` / `Host`**: Stores institutional credentials, role (`admin`, `warden`, `host`, `guard`, `visitor`, `student`), department, and roll number.
- **`Visitor`**: Visitor contact records, photo URLs, ID proofs, and blacklist status.
- **`Visit`**: Visit records with pass type, validity window, approval timestamps, check-in/out timestamps, and gate names.
- **`Student`**: Roll number, room number, floor, year, branch, guardian contacts, and disciplinary strikes.
- **`StudentMovement`**: Audit log of all student gate movements with exit/entry times, gates, and curfew violation flags.
- **`LostAndFoundItem`**: Lost/found item catalog, status (`reported`, `claimed`, `handed_over`), and claim PINs.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, TypeScript | Component-based single page application |
| **Build & Dev** | Vite 7 | Fast module bundling and hot module replacement |
| **Styling** | Tailwind CSS + CSS Modules | Responsive layout, dark mode, glassmorphism |
| **State** | Zustand | Lightweight client authentication and session state |
| **Forms** | React Hook Form | Form validation and submission handling |
| **Backend API** | Node.js, Express, TypeScript | REST API server with middleware validation |
| **Database** | PostgreSQL + Prisma ORM | Relational data persistence and migrations |
| **Email** | Resend API | Transactional emails with HTML templates |
| **Storage** | Cloudinary & Multer | ID proof and badge image uploads |
| **QR Engine** | `html5-qrcode`, `qrcode` | Camera-based barcode scanner and QR generator |
| **PWA** | `vite-plugin-pwa` | Offline service worker and mobile installability |

---

## Project Structure

```
Visitor-Management-System/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma             # PostgreSQL database schema
│   │   └── seed.ts                   # Database seed script & test users
│   ├── server/
│   │   ├── lib/                      # Email client, Prisma, logger
│   │   ├── middleware/               # JWT authentication & role authorization
│   │   ├── routes/                   # API route handlers
│   │   │   ├── auth.ts               # Login, signup, OTP, password reset
│   │   │   ├── visits.ts             # Visits CRUD, telemetry, kiosk
│   │   │   ├── students.ts           # Passes, curfew audits, hostel census
│   │   │   ├── emergency.ts          # SOS broadcast alerts
│   │   │   └── lostAndFound.ts       # Lost and found registry
│   │   └── index.ts                  # Express server entry point
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/               # Page views, dashboards, modals
    │   │   ├── Dashboard.tsx         # Role dashboard & live telemetry
    │   │   ├── StudentPassPortal.tsx # Outing passes & student gatepass ID
    │   │   ├── HostelHub.tsx         # 10-floor residential room matrix
    │   │   ├── SelfServiceKiosk.tsx  # Walk-in touch reception & photo snap
    │   │   ├── ScanQrCode.tsx        # Optical QR scanner (Students/Visitors)
    │   │   ├── StudentGateKiosk.tsx  # Student pass scanner & curfew logic
    │   │   ├── UnifiedVisitRegistration.tsx # Staff visitor invitation portal
    │   │   └── VisitLogs.tsx         # Scoped audit log with CSV export
    │   ├── hooks/                    # Custom React hooks
    │   ├── lib/                      # API client, date helpers, constants
    │   ├── store/                    # Zustand auth store
    │   └── App.tsx                   # Route definitions
    └── package.json
```

---

## Installation & Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/ram02krishna/Visitor-Management-System.git
cd Visitor-Management-System
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Configure environment variables in `backend/.env` (see below), then run:
```bash
# Generate Prisma Client & Run Migrations
npx prisma migrate dev --name init

# Seed default test accounts & sample data
npm run db:seed

# Start backend dev server
npm run dev
```

### 3. Frontend Setup
Open a new terminal window:
```bash
cd frontend
npm install

# Start frontend dev server
npm run dev
```

The application will be running at **`http://localhost:5174`** and the backend at **`http://localhost:5000`**.

---

## Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
DIRECT_URL="postgresql://user:password@host/dbname?sslmode=require"

JWT_SECRET="your-jwt-secret-key-min-32-chars"
GOOGLE_CLIENT_ID="your-google-oauth-client-id"

RESEND_API_KEY="re_your_api_key"
RESEND_FROM_EMAIL="IIITN Security <onboarding@resend.dev>"

CLOUDINARY_CLOUD_NAME="your_cloud_name"
CLOUDINARY_API_KEY="your_api_key"
CLOUDINARY_API_SECRET="your_api_secret"

PORT=5000
FRONTEND_URL="http://localhost:5174"
```

### Frontend (`frontend/.env`)
```env
VITE_API_BASE_URL="http://localhost:5000"
VITE_PORT=5174
```

---

## Seed Test Accounts

The seed script creates the following pre-configured accounts for testing:

| Role | Email | Password | Role Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@iiitn.ac.in` | `Admin@123` | Full administrative access |
| **Chief Warden** | `warden@iiitn.ac.in` | `Warden@123` | Hostel Block A governance |
| **Faculty Host** | `faculty@iiitn.ac.in` | `Host@123` | Dr. Amit Sharma (CSE Faculty) |
| **Security Guard** | `guard@iiitn.ac.in` | `Guard@123` | Main Gate security checkpoint |
| **Student** | `bt23cse026@iiitn.ac.in` | `Student@123` | Ram Krishna (Roll: BT23CSE026) |
| **Visitor** | `visitor@gmail.com` | `Visitor@123` | Guest visitor account |

---
