import { create } from "zustand";
import { supabase } from "../lib/supabase.ts";
import type { Database } from "../lib/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface User {
  id: string;
  auth_id: string;
  name: string;
  email: string;
  role: UserRole;
  department_id: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, departmentId: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // ✅ Initialize authentication
  initialize: async () => {
    console.log("🔄 Checking authentication...");
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error("❌ Supabase Auth Error:", error.message);
        set({ isAuthenticated: false, isLoading: false });
        return;
      }

      if (session?.user) {
        console.log("🔍 Supabase Session Found:", session);
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();

        if (hostError) throw hostError;

        // ❌ Block visitor role
        if (hostData.role === "visitor") {
          throw new Error("Visitor role is no longer supported");
        }

        set({
          user: hostData as User,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      } else {
        set({ isAuthenticated: false, isLoading: false, user: null });
      }
    } catch (err: unknown) {
      console.error("❌ Authentication Initialization Failed:", (err as Error).message);
      set({
        isAuthenticated: false,
        isLoading: false,
        error: (err as Error).message || "Failed to initialize auth",
      });
    }
  },

  // ✅ Login function
  login: async (email: string, password: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data?.user) {
        console.log("✅ User logged in:", data.user);
        const { data: hostData, error: hostError } = await supabase
          .from("hosts")
          .select("*")
          .eq("auth_id", data.user.id)
          .single();

        if (hostError) throw hostError;

        // ❌ Block visitor role
        if (hostData.role === "visitor") {
          throw new Error("Visitor role is no longer supported");
        }

        set({
          user: hostData as User,
          isAuthenticated: true,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: unknown) {
      console.error("❌ Login failed:", (error as Error).message);
      set({
        error: (error as Error).message || "Invalid credentials",
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
    }
  },

  // ✅ Signup function
  signup: async (email: string, password: string, name: string, departmentId: string) => {
    try {
      set({ isLoading: true, error: null });

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      console.log("User account created:", authData.user.id);

      const { error: hostError } = await supabase.from("hosts").insert({
        auth_id: authData.user.id,
        name,
        email,
        department_id: departmentId,
        role: "host",
        active: true,
      });

      if (hostError) {
        console.error("Failed to create host record:", hostError);
        throw new Error("Failed to complete registration. Please contact support.");
      }

      console.log("Signup successful!");
      set({ isLoading: false, error: null });
    } catch (error: unknown) {
      console.error("Signup failed:", (error as Error).message);
      set({
        error: (error as Error).message || "Failed to create account",
        isLoading: false,
      });
      throw error;
    }
  },

  // ✅ Logout function
  logout: async () => {
    try {
      set({ isLoading: true, error: null });
      await supabase.auth.signOut();
      console.log("🚪 User logged out");
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    } catch (error: unknown) {
      console.error("❌ Logout failed:", (error as Error).message);
      set({ error: "Failed to logout", isLoading: false });
    }
  },
}));
