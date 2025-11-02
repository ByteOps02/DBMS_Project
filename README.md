# Visitor Management System

This is a modern, real-time Visitor Management System designed to streamline the process of managing visitors in a corporate or campus environment. It provides a secure, efficient, and user-friendly way to track and manage visitor information, ensuring a smooth experience for both visitors and hosts.

## Table of Contents

*   [About the Project](#about-the-project)
*   [Key Features](#key-features)
*   [Technologies Used](#technologies-used)
*   [Getting Started](#getting-started)
    *   [Prerequisites](#prerequisites)
    *   [Installation and Setup](#installation-and-setup)
*   [How to Use the Application](#how-to-use-the-application)
    *   [First-time Signup and Login](#first-time-signup-and-login)
    *   [User Roles](#user-roles)
    *   [Logging in as an Admin or Guard](#logging-in-as-an-admin-or-guard)
    *   [Registering a New Visitor](#registering-a-new-visitor)
*   [Troubleshooting](#troubleshooting)

## About the Project

The goal of this project is to replace traditional, paper-based visitor management systems with a modern, digital solution. By leveraging real-time database technology, this system provides up-to-the-minute information about visitors, enhancing security and improving the overall visitor experience. The application is designed to be intuitive and easy to use for all users, from administrators to visitors.

## Key Features

*   **Real-time Updates:** The dashboard and visit logs are updated in real-time using Supabase's real-time capabilities.
*   **User Roles:** The application has three user roles: `admin`, `guard`, and `host`, each with different permissions and functionalities.
*   **Visitor Registration:** Hosts can register new visitors and request visits.
*   **Visit Approval:** Admins and guards can approve or deny visit requests.
*   **Dashboard:** A comprehensive dashboard that displays statistics about visits.
*   **User Management:** Admins can add, edit, and delete users.
*   **Public Display:** A public page that shows the real-time status of all visits.

## Technologies Used

*   **React:** A JavaScript library for building user interfaces.
*   **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
*   **Supabase:** An open-source Firebase alternative for building secure and scalable applications.
*   **Tailwind CSS:** A utility-first CSS framework for rapidly building custom user interfaces.
*   **Vite:** A fast build tool and development server for modern web projects.

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

3.  **Set up environment variables:**

    Create a `.env` file in the root of the project. You will need to get your Supabase project URL and anon key.

    *   Go to your Supabase project.
    *   In the left sidebar, click on the **"Settings"** icon (it looks like a gear).
    *   Click on **"API"**.
    *   Under **"Project API keys"**, you will find your **"URL"** and **"anon"** key.

    Copy these values into your `.env` file:

    ```
    VITE_SUPABASE_URL=your-supabase-project-url
    VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
    ```

4.  **Set up the database:**

    *   Go to your Supabase project.
    *   In the left sidebar, click on **"SQL Editor"** (it looks like a database icon with "SQL" on it).
    *   Click on **"New query"**.
    *   Open the `Supabase/20250403050148_nameless_haze.sql` file in this project, copy its entire content, and paste it into the SQL editor.
    *   Click the **"Run"** button. This will create all the necessary tables, roles, and policies in your database.

5.  **Run the application:**

    ```bash
    npm run dev
    ```

    This will start the development server, and you can access the application in your browser at the URL provided in the terminal (usually `https://localhost:5173`).

## How to Use the Application

### First-time Signup and Login

1.  **Open the application in your browser.**
2.  Click on the **"Sign up"** link.
3.  Fill out the signup form with your name, email, password, and select a department.
4.  Click the **"Sign up"** button.
5.  You will be redirected to the login page. Enter the email and password you just used to sign up.
6.  You will be logged in as a **host** and taken to the dashboard.

### User Roles

*   **Admin:** The superuser of the system. Admins can do everything, including managing users, viewing all visit logs, and approving/denying visits.
*   **Guard:** The security personnel of the system. Guards can view all visit logs and approve, deny, or mark visits as complete.
*   **Host:** An employee or resident who can host visitors. Hosts can request visits for their visitors and view the status of their requested visits.

### Logging in as an Admin or Guard

When you sign up for a new account through the application, it is assigned the "host" role by default. To log in as an admin or a guard, you need to manually change the role of a user in your Supabase database.

1.  **Go to your Supabase project.**
2.  In the left sidebar, click on **"Table Editor"**.
3.  Select the **`hosts`** table.
4.  Find the user whose role you want to change. You can identify the user by their email address.
5.  In the **`role`** column for that user, double-click on the current role (which should be "host").
6.  A dropdown menu will appear. Select **`admin`** or **`guard`** from the menu.
7.  Click the **"Save"** button at the top of the table editor.

Once you have changed the user's role, you can log in to the application with that user's email and password. The application will recognize the new role, and you will have access to the admin or guard functionalities.

### Registering a New Visitor

As a host, you can register a new visitor by navigating to the "Register Visitor" page. You will be presented with a form with the following fields:

*   **Full name:** The full name of the visitor.
*   **Email address:** The email address of the visitor. The visitor will receive an email with a QR code for their visit.
*   **Phone number:** The phone number of the visitor.
*   **Company:** The company the visitor works for (optional).
*   **Visitor Photo:** A photo of the visitor for identification purposes.
*   **Purpose of visit:** The reason for the visitor's visit.
*   **Host email:** This is the email address of the person whom the visitor intends to meet. This person must be an existing user in the system, typically with a `host` role. The system uses this to link the visit to a specific host.
*   **Entity email:** This is an **optional** field. It's for the email address of an additional entity or department that the visit might be associated with. For example, if a visitor is coming for a meeting related to the "IT Department," you might enter the email of the IT department's head or a general IT department email if such an entity is set up in your system. If the visit is solely for one host, you can leave this field blank.
*   **Check-in time:** The expected check-in time of the visitor.
*   **Check-out time:** The expected check-out time of the visitor.
*   **Valid until:** The date and time until which the visit is valid.
*   **Notes:** Any additional notes about the visit (optional).

## Troubleshooting

*   **Department selection is not appearing on the signup page:** This is likely due to an issue with the database policies. Make sure you have run the latest version of the `Supabase/20250403050148_nameless_haze.sql` script in your Supabase project.
*   **"Failed to create host record" error during signup:** This is likely because email confirmation is enabled in your Supabase project. Please follow the instructions in the "Database Setup" section to disable email confirmation.
*   **"Infinite recursion" error during login:** This is due to an issue with the database security policies. Make sure you have run the latest version of the `Supabase/20250403050148_nameless_haze.sql` script in your Supabase project.
