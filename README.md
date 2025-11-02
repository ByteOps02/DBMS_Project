# Visitor Management System

This is a modern, real-time Visitor Management System designed to streamline the process of managing visitors in a corporate or campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and hosts.

## Table of Contents

*   [About the Project](#about-the-project)
*   [Key Features](#key-features)
*   [Technologies Used](#technologies-used)
*   [Project Structure](#project-structure)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation and Setup](#installation-and-setup)
*   [How to Use the Application](#how-to-use-the-application)
    *   [First-time Signup and Login](#first-time-signup-and-login)
    *   [User Roles](#user-roles)
    *   [Logging in as an Admin or Guard](#logging-in-as-an-admin-or-guard)
    *   [Public Request Visit (No Login Required)](#public-request-visit-no-login-required)
    *   [Registering a New Visitor (Authenticated Hosts)](#registering-a-new-visitor-authenticated-hosts)
*   [Database Schema & Security](#database-schema--security)
*   [Documentation](#documentation)
*   [Troubleshooting](#troubleshooting)

## About the Project

The goal of this project is to replace traditional, paper-based visitor management systems with a modern, digital solution. By leveraging real-time database technology, this system provides up-to-the-minute information about visitors, enhancing security and improving the overall visitor experience. The application is designed to be intuitive and easy to use for all users, from administrators to visitors.

## Key Features

*   **Real-time Updates:** The dashboard and visit logs are updated in real-time using Supabase's real-time capabilities.
*   **User Roles:** The application has three user roles: `admin`, `guard`, and `host`, each with different permissions and functionalities.
*   **Visitor Registration:** Hosts can register new visitors and request visits.
*   **Public Request Visit:** Anonymous users can request visits without authentication through a public form.
*   **Visit Approval:** Admins and guards can approve or deny visit requests.
*   **Dashboard:** A comprehensive dashboard that displays statistics about visits.
*   **User Management:** Admins can add, edit, and delete users.
*   **Public Display:** A public page that shows the real-time status of all visits.
*   **QR Code Generation:** Automatic QR code generation for approved visits with email notifications.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Supabase:** An open-source Firebase alternative for building secure and scalable applications.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.

## Project Structure

The project follows a clean and organized structure:

```
DBMS_Project/
├── docs/              # All documentation files
├── public/            # Static assets
│   └── assets/        # Organized images and media
├── src/               # Source code
│   ├── components/    # React components
│   ├── lib/          # Utilities and configurations
│   └── store/        # State management
├── Supabase/         # Database schema
└── ...               # Configuration files
```

For a detailed breakdown of the project structure, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## Getting Started

### Prerequisites

*   [Node.js](https://nodejs.org/) (v18 or later)
*   [npm](https://www.npmjs.com/)
*   A [Supabase](https://supabase.com/) account. If you don't have one, you can create one for free.

### Installation and Setup

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd <repository-directory>
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Set up environment variables (`.env` file):**

    The application requires environment variables to connect to your Supabase project. Create a file named `.env` in the root of your project directory (e.g., `DBMS_Project/.env`).

    You will need to obtain your Supabase Project URL and Anon Key:

    *   Go to your Supabase project dashboard.
    *   In the left sidebar, click on the **"Settings"** icon (it looks like a gear).
    *   Click on **"API"** under the Project Settings menu.
    *   Under the **"Project API keys"** section, you will find:
        *   **`URL`**: This is your `VITE_SUPABASE_URL`.
        *   **`anon`** (public) key: This is your `VITE_SUPABASE_ANON_KEY`.

    Your `.env` file should look like this (replace the placeholder values with your actual keys):

    ```
    VITE_SUPABASE_URL="https://your-project-ref.supabase.co"
    VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvdXItcHJvamVjdC1yZWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY3ODkwNTYwMCwiZXhwIjoxOTk0MjY1NjAwfQ.YOUR_ANON_KEY_HERE"
    
    # Optional: EmailJS Configuration (for visitor registration email notifications)
    VITE_EMAILJS_SERVICE_ID="your-service-id"
    VITE_EMAILJS_TEMPLATE_ID="your-template-id"
    VITE_EMAILJS_PUBLIC_KEY="your-public-key"
    ```

    **Note:** The EmailJS configuration is optional. If not provided, the system will skip email notifications but visitor registration will still work.
    
    **To set up EmailJS** (for email notifications with QR codes), see the detailed guide: [EMAILJS_SETUP.md](./docs/EMAILJS_SETUP.md)

    **Important:** Do not commit your `.env` file to version control (e.g., Git). It's already included in the `.gitignore` file to prevent this. You can use the provided `.env.example` file as a template.

4.  **Set up the database:**

    *   Go to your Supabase project dashboard.
    *   In the left sidebar, click on **"SQL Editor"** (it looks like a database icon with "SQL" on it).
    *   Click on **"New query"**.
    *   Open the `Supabase/visitor_management_schema.sql` file located in your cloned project directory. Copy its entire content.
    *   Paste the copied SQL content into the Supabase SQL Editor.
    *   Click the **"Run"** button. This will create all the necessary tables, roles, and policies in your database.
    
    **Note:** The schema includes RLS (Row-Level Security) policies that allow public access to the Request Visit feature while maintaining security for other operations.

5.  **Run the application:**

    ```bash
    npm run dev
    ```

    This will start the development server, and you can access the application in your browser at the URL provided in the terminal (usually `https://localhost:5173`).

## How to Use the Application

### First-time Signup and Login

1.  **Open the application in your browser** (e.g., `https://localhost:5173`).
2.  Click on the **"Sign up"** link (or navigate to `/signup`).
3.  Fill out the signup form with your desired name, email, password, and select a department from the dropdown.
4.  Click the **"Sign up"** button.
5.  You will be redirected to the login page. Enter the email and password you just used to sign up.
6.  Click the **"Sign in"** button. You will be logged in as a **host** and taken to the dashboard.

### User Roles

*   **Admin:** The superuser of the system. Admins have comprehensive control, including managing all users, viewing all visit logs, and approving/denying visits.
*   **Guard:** The security personnel of the system. Guards can view all visit logs and have the authority to approve, deny, or mark visits as complete.
*   **Host:** An employee or resident who can host visitors. Hosts can request visits for their visitors and view the status of their requested visits.

### Logging in as an Admin or Guard

When you sign up for a new account through the application, it is assigned the "host" role by default. To log in as an admin or a guard, you need to manually change the role of a user in your Supabase database.

1.  **Go to your Supabase project dashboard.**
2.  In the left sidebar, click on **"Table Editor"** (it looks like a spreadsheet icon).
3.  Select the **`hosts`** table from the list of tables.
4.  Find the user whose role you want to change. You can identify the user by their email address.
5.  In the **`role`** column for that user, double-click on the current role (which should be "host").
6.  A dropdown menu will appear. Select either **`admin`** or **`guard`** from the menu.
7.  Click the **"Save"** button at the top of the table editor to apply the change.

Once you have changed the user's role in the database, you can log in to the application with that user's email and password. The application will recognize the new role, and you will have access to the admin or guard functionalities.

### Public Request Visit (No Login Required)

The application includes a **public-facing Request Visit form** that allows anyone to request a visit without needing to log in or have an account. This is useful for visitors who want to pre-register their visit.

1.  Navigate to the **Request Visit** page (accessible from the home page).
2.  Fill out the form with your visitor details:
    *   Full name, email, phone, company (optional)
    *   Purpose of visit
    *   Host email (optional - the person you're visiting)
    *   Check-in/check-out times and validity period
    *   Upload a photo (optional)
3.  Submit the form. The visit request will be created with a **"pending"** status.
4.  You'll receive an email with a QR code for your visit (if EmailJS is configured).
5.  The visit must be approved by an admin or guard before check-in.

**Security Note:** The Request Visit feature uses public RLS policies that allow anonymous users to create visitor records and visit requests. All visits are created as "pending" and require approval, maintaining security while providing convenience.

### Registering a New Visitor (Authenticated Hosts)

As a logged-in host, you can register a new visitor by navigating to the "Register Visitor" page within the application. You will be presented with a form with the following fields:

*   **Full name:** The complete name of the visitor.
*   **Email address:** The visitor's email address. An email containing a QR code for their visit will be sent to this address.
*   **Phone number:** The visitor's contact phone number.
*   **Company:** The organization or company the visitor represents (optional).
*   **Visitor Photo:** An option to upload a photo of the visitor for identification purposes.
*   **Purpose of visit:** A brief description of the reason for the visitor's visit.
*   **Host email:** This is the email address of the person whom the visitor intends to meet. This person **must** be an existing user in the system, typically with a `host` role. The system uses this email to link the visit to a specific host.
*   **Entity email:** This is an **optional** field. It's for the email address of an additional entity or department that the visit might be associated with. For example, if a visitor is coming for a meeting related to the "IT Department," you might enter the email of the IT department's head or a general IT department email if such an entity is set up in your system. If the visit is solely for one host, you can leave this field blank.
*   **Check-in time:** The expected date and time the visitor will check in.
*   **Check-out time:** The expected date and time the visitor will check out.
*   **Valid until:** The date and time until which the visit is valid.
*   **Notes:** Any additional notes or special instructions about the visit (optional).

## Database Schema & Security

The application uses **Row-Level Security (RLS)** policies in Supabase to ensure data security:

### RLS Policies Overview:

*   **Visitors Table:**
    *   `visitors_insert_public` - Allows anonymous users to create visitor records (for Request Visit)
    *   `visitors_update_public_or_privileged` - Allows anonymous updates for repeat visits
    *   `visitors_select_authenticated` - Only authenticated users can view visitor data
    *   `visitors_delete_admin_only` - Only admins can delete visitors

*   **Visits Table:**
    *   `visits_insert_public` - Allows anonymous users to create visit requests
    *   `visits_select_own_or_privileged` - Hosts see their visits, admins/guards see all
    *   `visits_update_host_or_privileged` - Hosts can update their visits, admins/guards can update all
    *   `visits_delete_admin_only` - Only admins can delete visits

*   **Hosts Table:**
    *   `hosts_insert_self` - Users can create their own host record during signup
    *   `hosts_select_own_or_privileged` - Users see their own record, admins/guards see all
    *   `hosts_update_admin_only` - Only admins can modify host records
    *   `hosts_delete_admin_only` - Only admins can delete hosts

### Database Schema File:
The complete schema is in `Supabase/visitor_management_schema.sql` and includes:
- Table definitions (departments, hosts, visitors, visits)
- ENUM types (visit_status, user_role)
- RLS policies for security
- Indexes for performance
- Triggers for automatic timestamp updates

## Documentation

Additional documentation is available in the `docs/` folder:

*   **[QUICKSTART.md](./docs/QUICKSTART.md)** - Quick start guide for getting up and running
*   **[EMAILJS_SETUP.md](./docs/EMAILJS_SETUP.md)** - Detailed EmailJS configuration guide
*   **[CODE_QUALITY.md](./docs/CODE_QUALITY.md)** - Code quality guidelines and best practices
*   **[CONSOLE_LOGGING_GUIDE.md](./docs/CONSOLE_LOGGING_GUIDE.md)** - Guide for debugging and logging
*   **[IMPROVEMENTS.md](./docs/IMPROVEMENTS.md)** - Planned features and improvements
*   **[PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)** - Detailed project structure documentation
*   **[CONTRIBUTING.md](./CONTRIBUTING.md)** - Guidelines for contributing to the project

### Database Documentation:
*   **[Supabase/APPLY_FIX_INSTRUCTIONS.md](./Supabase/APPLY_FIX_INSTRUCTIONS.md)** - Quick fix for RLS policy issues

## Troubleshooting

*   **Department selection is not appearing on the signup page:** This is likely due to an issue with the database policies. Ensure you have run the latest version of the `Supabase/visitor_management_schema.sql` script in your Supabase project.
*   **"Failed to create host record" error during signup:** This is likely because email confirmation is enabled in your Supabase project. Please follow the instructions in the "Database Setup" section to disable email confirmation.
*   **"Infinite recursion" error during login:** This is due to an issue with the database security policies. Ensure you have run the latest version of the `Supabase/visitor_management_schema.sql` script in your Supabase project.
*   **"New row violates row-level security policy" error on Request Visit:** This error occurs if the RLS policies are not properly configured. The `visitor_management_schema.sql` includes the necessary public policies. If you're using an older schema, see `Supabase/APPLY_FIX_INSTRUCTIONS.md` for a quick fix.