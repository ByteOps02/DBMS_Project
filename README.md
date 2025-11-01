# Visitor Management System

This is a visitor management system built with React, TypeScript, and Supabase.

## Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```
2.  **Set up Supabase:**
    *   Create a new project on [Supabase](https://supabase.io/).
    *   Go to the **SQL Editor** and run the script from `Supabase/20250403050148_nameless_haze.sql` to create the necessary tables and policies.
3.  **Configure environment variables:**
    *   Create a `.env` file in the root of the project.
    *   Add your Supabase URL and anon key to the `.env` file:
        ```
        VITE_SUPABASE_URL="YOUR_SUPABASE_URL"
        VITE_SUPABASE_ANON_KEY="YOUR_SUPABASE_ANON_KEY"
        ```
4.  **Run the development server:**
    ```bash
    npm run dev
    ```

## Usage

*   **Signup:** Create a new account by providing your name, email, password, and department.
*   **Login:** Log in to your account with your email and password.
*   **Dashboard:** View the main dashboard.
*   **Visitor Registration:** Register a new visitor.
*   **Request Visit:** Request a new visit for a visitor.
*   **Visitor Approval:** Approve or deny visit requests.
*   **Visit Logs:** View the logs of all visits.
*   **User Management:** Manage users.
*   **Public Display:** View a public display of current visitors.