import { useState, useEffect, useCallback, useRef } from "react";
import {
  Edit3,
  Trash2,
  Search,
  Mail,
  Shield,
  Users as UsersIcon,
  Inbox,
  Check,
} from "lucide-react";
import { PageHeader } from "./PageHeader";
import { api } from "../lib/api";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";

type Profile = Database["public"]["Tables"]["hosts"]["Row"];

const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
};

const getRoleLabel = (role: string) => {
  const map: Record<string, string> = {
    admin: "Administrator",
    warden: "Hostel Warden",
    host: "Faculty / Host",
    guard: "Security Guard",
    student: "Resident Student",
    visitor: "Visitor / Guest",
  };
  return map[role] ?? role;
};


export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState<Profile[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("vms_users") ?? "null") ?? [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => localStorage.getItem("vms_users") === null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const initialLoadDone = useRef(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const fetchUsers = useCallback(async () => {
    if (!initialLoadDone.current) setLoading(true);

    try {
      const data = await api.hosts.list(debouncedSearchTerm || undefined);
      setUsers(data);
      if (!debouncedSearchTerm) {
        try {
          localStorage.setItem("vms_users", JSON.stringify(data));
        } catch {
          // Ignore cache write errors
        }
      }
    } catch {
      toast.error("Failed to fetch users");
    }
    initialLoadDone.current = true;
    setLoading(false);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Are you sure you want to delete this user? This action cannot be undone."))
      return;
    try {
      await api.hosts.delete(userId);
      toast.success("User deleted successfully");
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to delete user");
    }
  };

  const handleUpdateRole = async (newRole: string) => {
    if (!editingUser) return;
    setIsUpdating(true);
    try {
      await api.hosts.update(editingUser.id, {
        role: newRole as "admin" | "guard" | "host" | "visitor",
      });
      toast.success(`Role updated to ${getRoleLabel(newRole)}`);
      setEditingUser(null);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to update role");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-12 animate-fadeIn max-w-7xl mx-auto">
      <BackButton to="/app/dashboard" />

      <PageHeader
        icon={UsersIcon}
        gradient="from-sky-500 to-blue-600"
        title="User Directory & Access Control"
        description="Manage campus administrative accounts, role assignments, and security permissions."
        right={
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              id="user-search"
              className="block w-full rounded-2xl border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2.5 pl-10 pr-4 text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all shadow-xs"
              placeholder="Search by name or email..."
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        }
      />

      <div className="mt-6">
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          <div className="lg:hidden px-6 py-2 bg-sky-50/50 dark:bg-sky-900/10 border-b border-gray-100 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-sky-600/60 dark:text-sky-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">←</span> Swipe horizontally to see more details{" "}
              <span className="animate-pulse">→</span>
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-800 min-w-[800px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-slate-800/60">
                  <th
                    scope="col"
                    className="py-3.5 pl-6 pr-3 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    User
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden lg:table-cell"
                  >
                    Email Address
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider"
                  >
                    System Role
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell"
                  >
                    Account Status
                  </th>
                  <th scope="col" className="relative py-3.5 pr-6 text-right text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80 bg-white dark:bg-slate-900 text-xs">

                {loading ? (
                  <>
                    {[...Array(5)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 pl-4 pr-3 sm:pl-6">
                          <div className="flex items-center gap-3">
                            <div className="skeleton w-9 h-9 rounded-[1.25rem] shrink-0" />
                            <div className="space-y-2 w-full">
                              <div className="skeleton h-4 w-24 rounded" />
                              <div className="skeleton h-3 w-32 rounded lg:hidden" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 hidden lg:table-cell">
                          <div className="skeleton h-4 w-40 rounded" />
                        </td>
                        <td className="px-3 py-4 hidden lg:table-cell">
                          <div className="skeleton h-5 w-20 rounded-xl" />
                        </td>
                        <td className="px-3 py-4 hidden lg:table-cell">
                          <div className="skeleton h-5 w-20 rounded-xl" />
                        </td>
                        <td className="py-4 pl-3 pr-4 sm:pr-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="skeleton h-8 w-8 rounded-2xl" />
                            <div className="skeleton h-8 w-8 rounded-2xl" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800 ring-1 ring-gray-200 dark:ring-slate-700">
                          <Inbox className="w-7 h-7 text-gray-300 dark:text-slate-600" />
                        </div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          No users found
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  users.map((user, idx) => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors"
                      style={{ animationDelay: `${idx * 0.02}s` }}
                    >
                      <td className="py-3.5 pl-6 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black text-xs shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">
                              {user.name}
                            </p>
                            <div className="lg:hidden flex items-center gap-1.5 mt-0.5">
                              <Mail className="h-3 w-3 text-gray-400" />
                              <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-slate-300 hidden lg:table-cell whitespace-nowrap font-medium">
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                          <Shield className="w-3 h-3" />
                          <span>{getRoleLabel(user.role)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            user.active
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50"
                              : "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/50"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${user.active ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`}
                          />
                          <span>{user.active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>
                      <td className="py-3.5 pr-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingUser(user)}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-gray-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer"
                            title="Edit Role"
                          >
                            <Edit3 className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 rounded-xl bg-gray-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-gray-600 dark:text-slate-300 hover:text-red-600 dark:hover:text-red-400 transition-all cursor-pointer"
                            title="Delete User"
                          >
                            <Trash2 className="h-3.5 w-3.5" strokeWidth={2.5} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}

              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-8">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setEditingUser(null)}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-slate-700">
            <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-white/60 dark:border-slate-700/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/25">
                  <Shield className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">
                    Update Role
                  </h3>
                  <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-tight truncate max-w-[180px]">
                    {editingUser.name}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest ml-1">
                Select New Role
              </p>
              <div className="grid grid-cols-1 gap-2">
                {["admin", "warden", "host", "guard", "student", "visitor"].map((role) => (
                  <button

                    key={role}
                    onClick={() => handleUpdateRole(role)}
                    disabled={isUpdating}
                    className={`flex items-center justify-between px-3 py-2 rounded-2xl border transition-all ${
                      editingUser.role === role
                        ? "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800 text-sky-700 dark:text-sky-400 font-black"
                        : "bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 text-gray-600 dark:text-slate-400 hover:border-gray-200 dark:hover:border-slate-700 font-bold"
                    }`}
                  >
                    <span className="text-xs uppercase tracking-widest">{getRoleLabel(role)}</span>
                    {editingUser.role === role && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn-secondary w-full py-2.5"
                >
                  Cancel
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
