# Visitor Management System

## Overview
This project is a comprehensive full-stack web application designed to help organizations manage visitor access, track campus traffic, and ensure security. It features real-time updates, role-based access control, automated QR code generation, and email notifications for approved visits. 

The application is built with a modern tech stack featuring **React (Vite)** on the frontend and an **Express + Node.js** backend utilizing **Prisma ORM** with **PostgreSQL**. It delivers a seamless experience across desktop and mobile devices with PWA support.

## Features

### Core Functionality
- **User Roles:** Four distinct roles with specific permissions:
  - **Visitor:** Register own visits, view visit history, track approval status, and manage personal profile.
  - **Host:** Register visitors, create visit requests, view visit logs, manage own visitors.
  - **Guard:** Approve/deny visit requests, scan QR codes for check-in/out at specific gates, monitor ongoing visits.
  - **Admin:** Full system access, user management (role assignment), analytics, bulk operations.
- **Advanced Visit Tracking:** Support for both **Single-Day** and **Multi-Day** passes with precise **Valid From** and **Valid Until** enforcement.
- **Visitor Registration:** Hosts can pre-register visitors with detailed information (name, email, phone, photo, ID proof).
- **Visit Approval Workflow:** Multi-stage process: `pending` → `approved`/`denied` → `checked-in` → `completed`.
- **QR Code System:** Automatic high-density QR code generation for approved visits with instant email delivery.
- **Email Notifications:** Automated emails via EmailJS with customizable templates for registration, approval, and denial.

### Security & Compliance
- **QR Scanner:** Integrated HTML5 scanner for security guards to verify visitor identity and validity in real-time.
- **Gate-Specific Logging:** Guards can select specific campus gates (Main, North, South, etc.) for check-in and check-out logs.
- **Blacklist Management:** Guard/Admin can block suspicious visitors with mandatory reason logging, preventing future registrations.
- **Identity Verification:** Mandatory photo and ID proof uploads during registration using **Cloudinary** for scalable media storage.

### Administrative Features
- **User Management:** Comprehensive panel to manage system users, including the ability to update roles (Admin/Guard/Host/Visitor).
- **Bulk Visitor Upload:** CSV import for batch visitor registrations with real-time validation.
- **Visit Logs:** Advanced filtering, search, and role-based data access.
- **Analytics:** Insightful statistics and trends on campus visitation.

### Technical & UX Highlights
- **Performance Optimized:** Component-level memoization and optimized data fetching patterns.
- **Mobile-First Experience:** 
  - **Slidable Bottom Navigation:** Horizontally slidable navbar for easy access to all features on mobile.
  - **PWA Support:** Installable, offline support, and auto-updating service workers.
- **Dark Mode:** Full native theme switching with persistent user preferences.
- **Role-Based Access Control (RBAC):** Token-based role verification and frontend route guards.

## Authentication & Security Architecture

### Custom JWT Authentication
The system leverages a robust custom authentication service built directly into the Express backend:
- **JWT-Based Sessions:** Authentication is handled using JSON Web Tokens (JWT). Upon login/signup, the backend issues a JWT that is securely stored and passed via Authorization headers.
- **Stateless & Scalable:** The API maintains a stateless architecture utilizing Express middleware (`auth.ts`) to verify tokens and assign `req.user` contexts.
- **Password Security:** All user credentials are cryptographically hashed and salted using `bcryptjs` before being stored in the database.

## Tech Stack

| Category | Technology | Purpose |
|----------|-----------|---------|
| **Frontend** | React 18 + TypeScript | UI framework with type safety |
| **Build Tool** | Vite | Fast development and production builds |
| **Styling** | Tailwind CSS | Utility-first CSS framework |
| **Backend** | Express + Node.js | Robust REST API server |
| **Database ORM** | Prisma | Type-safe database access and migrations |
| **Database** | PostgreSQL | Relational database management system |
| **State Management** | Zustand | Lightweight state management (Auth store) |
| **Form Handling** | React Hook Form + Zod | Form management with schema validation |
| **Routing** | React Router v7 | Client-side routing with nested routes |
| **Email Service** | EmailJS | Email delivery with custom templates |
| **File Storage** | Cloudinary & Multer | Secure cloud storage for visitor ID/Photos |
| **QR Scanning** | html5-qrcode | Browser-based QR code scanning |
| **CSV Processing** | PapaParse | Parse and process CSV files |
| **PWA** | vite-plugin-pwa | Progressive Web App support |

## Project Structure

```
Visitor-Management-System/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma                 # Database schema definition
│   ├── server/
│   │   ├── routes/                       # Express API endpoints
│   │   ├── middleware/                   # Auth and Validation middlewares
│   │   └── index.ts                      # Express server entry point
│   └── package.json                      # Backend dependencies and scripts
└── frontend/
    ├── src/
    │   ├── components/                   # React UI Components
    │   ├── hooks/                        # Custom React hooks
    │   ├── lib/                          # Shared utilities (API clients, logger)
    │   ├── store/                        # Global state (Zustand)
    │   └── index.css                     # Tailwind & Global Styles
    └── package.json                      # Frontend dependencies and scripts
```

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ram02krishna/Visitor-Management-System.git
   cd Visitor-Management-System
   ```

2. **Backend Setup:**
   Open a terminal and navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
   Create a `.env` file in the `backend` directory based on `.env.example`:
   ```env
   # Database Configuration (Neon/PostgreSQL)
   DATABASE_URL="postgresql://user:password@host-pooler.region.aws.neon.tech/dbname?sslmode=require"
   DIRECT_URL="postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require"

   # Authentication
   JWT_SECRET="your-super-secret-jwt-key-at-least-32-chars"

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME="your_cloud_name"
   CLOUDINARY_API_KEY="your_api_key"
   CLOUDINARY_API_SECRET="your_api_secret"

   # Server Configuration
   PORT=5000
   FRONTEND_URL="http://localhost:5174"
   ```
   Run Database migrations and apply seeds:
   ```bash
   npm run db:generate
   npm run db:migrate
   npm run db:seed
   ```
   Start the backend development server:
   ```bash
   npm run dev
   ```

3. **Frontend Setup:**
   Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```
   Create a `.env` file in the `frontend` directory based on `.env.example`:
   ```env
   # API Configuration
   VITE_API_BASE_URL="http://localhost:5000"
   VITE_PORT=5174

   # EmailJS Configuration (Frontend)
   VITE_EMAILJS_SERVICE_ID="service_xxxxxxx"
   VITE_EMAILJS_PUBLIC_KEY="your-public-key-here"
   VITE_EMAILJS_TEMPLATE_ID="template_xxxxxxx"
   VITE_EMAILJS_APPROVAL_TEMPLATE_ID="template_xxxxxxx"
   VITE_EMAILJS_DENIAL_TEMPLATE_ID="template_xxxxxxx"
   ```
   Start the frontend development server:
   ```bash
   npm run dev
   ```
   The frontend will run on `http://localhost:5174` and communicate with the backend on `http://localhost:5000`.

## Author

**ram02krishna**
- GitHub: [@ram02krishna](https://github.com/ram02krishna)
- Repository: [Visitor-Management-System](https://github.com/ram02krishna/Visitor-Management-System)
