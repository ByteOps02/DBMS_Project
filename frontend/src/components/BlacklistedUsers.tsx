import { useState, useEffect, useCallback } from "react";
import { Search, Mail, ShieldAlert, CheckCircle2 } from "lucide-react";

import { PageHeader } from "./PageHeader";
import { api } from "../lib/api";
import { useDataSync } from "../lib/dataSync";
import { toast } from "react-hot-toast";
import type { Database } from "../lib/database.types";
import { BackButton } from "./BackButton";
import { format } from "date-fns";

type Visitor = Database["public"]["Tables"]["visitors"]["Row"];

export function BlacklistedUsers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [visitors, setVisitors] = useState<Visitor[]>(() => api.uiCache.get("vms_blacklisted") || []);
  const [loading, setLoading] = useState(!api.uiCache.has("vms_blacklisted"));

  const fetchBlacklisted = useCallback(async (isBackground = false) => {
    if (!isBackground && ((visitors.length === 0 && !api.uiCache.has("vms_blacklisted")) || searchTerm)) {
      setLoading(true);
    }

    try {
      const data = await api.visitors.list({
        blacklisted: true,
        search: searchTerm || undefined,
      });
      setVisitors(data || []);
      if (!searchTerm) {
        api.uiCache.set("vms_blacklisted", data || []);
      }
    } catch {
      if (!isBackground) {
        toast.error("Failed to fetch blacklisted visitors");
      }
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [searchTerm, visitors.length]);

  // Real-time synchronization subscription
  useDataSync(["visitors", "all"], () => {
    fetchBlacklisted(true);
  });

  useEffect(() => {
    const delay = searchTerm ? 300 : 0;
    const delayDebounceFn = setTimeout(() => {
      fetchBlacklisted();
    }, delay);

    // 5s background sync polling
    const interval = setInterval(() => {
      fetchBlacklisted(true);
    }, 5000);

    return () => {
      clearTimeout(delayDebounceFn);
      clearInterval(interval);
    };
  }, [fetchBlacklisted, searchTerm]);

  const handleUnblacklist = async (visitorId: string) => {
    // Optimistic UI update
    setVisitors((prev) => prev.filter((v) => v.id !== visitorId));
    api.uiCache.set("vms_blacklisted", (api.uiCache.get("vms_blacklisted") || []).filter((v: Visitor) => v.id !== visitorId));

    try {
      await api.visitors.update(visitorId, { is_blacklisted: false, blacklist_reason: null });
      toast.success("Visitor unblocked successfully");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Failed to unblock visitor");
      fetchBlacklisted();
    }
  };


  return (
    <div className="px-4 sm:px-6 lg:px-8 pb-8">
      <div className="max-w-7xl mx-auto">
        <BackButton />
        <PageHeader
          icon={ShieldAlert}
          gradient="from-red-500 to-rose-600"
          title="Blacklist Users"
          description="Manage blacklisted visitors and security blocks."
        />

      </div>

      <div className="max-w-7xl mx-auto mt-6">
        <div className="mb-4 relative w-full max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            id="user-search"
            className="block w-full rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            placeholder="Search by name or email..."
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[1.5rem] shadow-sm dark:shadow-none transition-all duration-300 h-full flex flex-col overflow-hidden">
          <div className="lg:hidden px-6 py-2 bg-red-50/50 dark:bg-red-900/10 border-b border-gray-100 dark:border-slate-800/50">
            <p className="text-[9px] font-black text-red-600/60 dark:text-red-400/60 uppercase tracking-widest flex items-center gap-1.5">
              <span className="animate-pulse">←</span> Swipe horizontally to see more details{" "}
              <span className="animate-pulse">→</span>
            </p>
          </div>
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full divide-y divide-gray-200 dark:divide-slate-700 min-w-[800px]">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100/50 dark:from-slate-800 dark:to-slate-800/50">
                  <th
                    scope="col"
                    className="py-3.5 pl-4 pr-3 sm:pl-6 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    Visitor
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    Contact
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    Reason
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3.5 text-left text-[10px] font-black text-gray-500 dark:text-slate-400 uppercase tracking-widest"
                  >
                    Date Blocked
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800/80">


                {loading ? (
                  <>
                    {[...Array(3)].map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-2.5 pl-4 pr-3 sm:pl-5">
                          <div className="flex items-center gap-2.5">
                            <div className="skeleton w-7 h-7 rounded-lg shrink-0" />
                            <div className="space-y-1.5 w-full">
                              <div className="skeleton h-3.5 w-24 rounded" />
                              <div className="skeleton h-3 w-32 rounded lg:hidden" />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="skeleton h-3.5 w-40 rounded" />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="skeleton h-3.5 w-32 rounded" />
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="skeleton h-3.5 w-24 rounded" />
                        </td>
                        <td className="py-2.5 pl-3 pr-4 sm:pr-5 text-right">
                          <div className="skeleton h-7 w-20 rounded-lg ml-auto" />
                        </td>
                      </tr>
                    ))}
                  </>
                ) : visitors.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-200 dark:ring-emerald-800 border border-emerald-100 dark:border-emerald-700/50">
                          <ShieldAlert className="w-7 h-7 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">
                          No Blacklisted Visitors
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  visitors.map((visitor, idx) => (
                    <tr
                      key={visitor.id}
                      className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors"
                      style={{ animationDelay: `${idx * 0.02}s` }}
                    >
                      <td className="py-2.5 pl-4 pr-3 sm:pl-5 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-[11px] shrink-0 shadow-xs">
                            {visitor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">
                              {visitor.name}
                            </p>
                            <div className="lg:hidden flex flex-col gap-0.5 mt-0.5">
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3 text-gray-400" />
                                <span className="text-[10px] text-gray-400 truncate max-w-[150px]">
                                  {visitor.email}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Mail className="h-3.5 w-3.5 text-gray-400" /> {visitor.email}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600 dark:text-red-400">
                          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                          <span
                            className="truncate max-w-[200px]"
                            title={visitor.blacklist_reason || "Not specified"}
                          >
                            {visitor.blacklist_reason || "Not specified"}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-medium text-gray-500 dark:text-slate-400 whitespace-nowrap">
                        {visitor.updated_at
                          ? format(new Date(visitor.updated_at), "MMM d, yyyy")
                          : "N/A"}
                      </td>
                      <td className="py-2.5 pl-3 pr-4 sm:pr-5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleUnblacklist(visitor.id)}
                          className="btn btn-sm bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2.5} /> Unblock
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

          </div>
        </div>
      </div>
    </div>
  );
}
