import { useState, useEffect, useCallback, memo } from "react";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth";
import { AlertCircle, Hourglass, Users, CalendarDays, RefreshCw, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVisitStats } from "../hooks/useVisitStats";
import { StatsGrid } from "./StatsGrid";
import { formatDistanceToNow } from "date-fns";
import { formatISTTime, getISTTodayRange } from "../lib/dateIST";
import { getStatusConfig } from "../lib/statusConfig";
import { SEOMeta } from "./SEOMeta";

function getInitials(name: string) {
  if (!name) return "US";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
}

type RecentVisit = {
  id: string;
  purpose: string;
  status: string;
  created_at: string;
  visitor: { name: string; email: string } | null;
};

type ActiveVisitor = {
  id: string;
  purpose: string;
  check_in_time: string;
  visitor: { name: string; email: string } | null;
};

function useLiveDuration(checkInTime: string | null) {
  const [duration, setDuration] = useState("");
  useEffect(() => {
    if (!checkInTime) return;
    const update = () => {
      const ms = Date.now() - new Date(checkInTime).getTime();
      const totalMins = Math.floor(ms / 60000);
      const h = Math.floor(totalMins / 60);
      const m = totalMins % 60;
      setDuration(h > 0 ? `${h}h ${m}m` : `${m}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [checkInTime]);
  return duration;
}

const ActiveVisitorRow = memo(({ visitor }: { visitor: ActiveVisitor }) => {
  const duration = useLiveDuration(visitor.check_in_time);
  const name = visitor.visitor?.name ?? "Unknown";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .substring(0, 2)
    .toUpperCase();
  return (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150">
      <div className="w-9 h-9 rounded-[1.25rem] bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
        <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{visitor.purpose}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
        </span>
        <span className="text-xs font-semibold text-teal-600 dark:text-teal-400">{duration}</span>
      </div>
    </div>
  );
});

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { stats, loading, error: statsError, fetchStats } = useVisitStats(user);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [recentVisits, setRecentVisits] = useState<RecentVisit[]>(() => api.uiCache.get("vms_dash_recent") || []);
  const [recentLoading, setRecentLoading] = useState(!api.uiCache.has("vms_dash_recent"));
  const [activeVisitors, setActiveVisitors] = useState<ActiveVisitor[]>(() => api.uiCache.get("vms_dash_active") || []);
  const [activeLoading, setActiveLoading] = useState(!api.uiCache.has("vms_dash_active"));
  const isGuardOrAdmin = user?.role === "admin" || user?.role === "guard";

  const handleStatCardClick = useCallback(
    (status: string) => {
      if (status === "total_users") {
        navigate("/app/users");
      } else {
        navigate(`/app/visits/${status}`);
      }
    },
    [navigate]
  );

  const prefetchVisits = useCallback(
    async (status: string) => {
      if (status === "total_users" || !user) return;

      try {
        const statuses = status === "cancelled_denied" ? ["cancelled", "denied"] : undefined;
        const [utcTodayStart, utcTomorrowStart] = getISTTodayRange();

        await api.visits.list({
          ...(statuses ? { statuses } : { status }),
          ...(user?.role === "host" ? { host_id: user.id } : {}),
          ...(status === "approved"
            ? { approved_from: utcTodayStart, approved_to: utcTomorrowStart }
            : {}),
          ...(status === "completed"
            ? { checkout_from: utcTodayStart, checkout_to: utcTomorrowStart }
            : {}),
          ...(status === "cancelled_denied"
            ? { created_from: utcTodayStart, created_to: utcTomorrowStart }
            : {}),
          limit: 50,
        });
      } catch {
        // Ignore prefetch errors
      }
    },
    [user]
  );

  const fetchRecentVisits = useCallback(async (force = false) => {
    try {
      const data = await api.visits.list({
        ...(user?.role === "host" ? { host_id: user.id } : {}),
        ...(force ? { _t: Date.now() } : {}),
        limit: 5,
      });
      const visits = (data as unknown as RecentVisit[]) || [];
      setRecentVisits(visits);
      api.uiCache.set("vms_dash_recent", visits);
    } catch {
      // Ignore fetch errors
    } finally {
      setRecentLoading(false);
    }
  }, [user]);

  const fetchActiveVisitors = useCallback(async (force = false) => {
    if (user?.role !== "admin" && user?.role !== "guard" && user?.role !== "host") {
      setActiveLoading(false);
      return;
    }

    try {
      const data = await api.visits.list({
        status: "checked_in",
        ...(user?.role === "host" ? { host_id: user.id } : {}),
        ...(force ? { _t: Date.now() } : {}),
      });
      const visitors = (data as unknown as ActiveVisitor[]) || [];
      setActiveVisitors(visitors);
      api.uiCache.set("vms_dash_active", visitors);
    } catch {
      // Ignore fetch errors
    } finally {
      setActiveLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user?.role) return;
    Promise.all([fetchStats(), fetchRecentVisits(), fetchActiveVisitors()]);
    setLastRefresh(new Date());
    const refreshInterval = setInterval(() => {
      Promise.all([fetchStats(true), fetchRecentVisits(true), fetchActiveVisitors(true)]);
      setLastRefresh(new Date());
    }, 10000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [user?.role, user?.id, fetchStats, fetchRecentVisits, fetchActiveVisitors]);

  return (
    <div className="pb-8">
      <SEOMeta title="Dashboard" />
      
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 sm:gap-5">
          <div className="hidden xs:flex w-14 h-14 sm:w-[72px] sm:h-[72px] rounded-[2.2rem] bg-[#3b82f6] shadow-[0_8px_30px_rgb(59,130,246,0.3)] text-white items-center justify-center text-xl sm:text-3xl font-extrabold border-[3px] border-white dark:border-slate-800 shrink-0">
            {getInitials(user?.name || "")}
          </div>
          <div className="flex flex-col justify-center min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-[42px] font-black text-[#1e293b] dark:text-white tracking-tighter leading-none truncate">
              Welcome back,{" "}
              <span className="text-[#3b82f6] underline decoration-blue-500/20 underline-offset-4">
                {user?.name?.split(" ")[0] || "Guest"}
              </span>
            </h1>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest">
                  Live updates
                </p>
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-slate-500">
                <RefreshCw className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden xxs:inline">Sync:</span> {formatISTTime(lastRefresh)}
              </div>
              <span className="hidden xs:block text-slate-300 dark:text-slate-700">|</span>
              
              <div className="flex items-center gap-1.5 text-[11px] sm:text-sm font-medium text-slate-500">
                <CalendarDays className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                {new Date().toLocaleDateString("en-IN", {
                  timeZone: "Asia/Kolkata",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {statsError && (
        <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 text-red-700 dark:text-red-300 rounded-2xl flex items-center shadow-sm">
          <AlertCircle className="h-6 w-6 mr-3 text-red-500" />
          <span className="font-medium">{statsError}</span>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-4">
          Overview
        </h2>
        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="skeleton h-[160px] w-full border border-gray-100 dark:border-slate-800"
              ></div>
            ))}
          </div>
        ) : (
          <StatsGrid
            stats={stats}
            handleStatCardClick={handleStatCardClick}
            handlePrefetch={prefetchVisits}
          />
        )}
      </div>

      {(isGuardOrAdmin || user?.role === "host") && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Active Visitors
              </h2>
              {activeVisitors.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 text-[11px] font-bold text-white bg-teal-500 rounded-lg">
                  {activeVisitors.length}
                </span>
              )}
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wide">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
              </span>
              Live
            </span>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
            {activeLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="skeleton h-3.5 w-28 rounded" />
                      <div className="skeleton h-3 w-40 rounded" />
                    </div>
                    <div className="skeleton h-5 w-12 rounded-full" />
                  </div>
                ))}
              </div>
            ) : activeVisitors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900/20 rounded-full flex items-center justify-center mb-4 ring-8 ring-teal-50/50 dark:ring-teal-900/10">
                  <Users className="w-8 h-8 text-teal-400 dark:text-teal-500 opacity-80" />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                  No Active Visitors
                </h3>
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px]">
                  There are no visitors currently checked-in on campus.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {activeVisitors.map((v) => (
                  <ActiveVisitorRow key={v.id} visitor={v} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Recent Visits
          </h2>
          <button
            onClick={() => navigate('/app/logs')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 border border-sky-100 dark:border-sky-800/40 transition-all duration-200 active:scale-95"
          >
            View All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 overflow-hidden">
          {recentLoading ? (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4">
                  <div className="skeleton w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-32 rounded" />
                    <div className="skeleton h-3 w-48 rounded" />
                  </div>
                  <div className="skeleton h-6 w-20 rounded-full" />
                </div>
              ))}
            </div>
          ) : recentVisits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 ring-8 ring-gray-50/50 dark:ring-slate-800/50">
                <Hourglass className="w-8 h-8 text-gray-400 dark:text-slate-500 opacity-80" />
              </div>
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                No Visits Yet
              </h3>
              <p className="text-xs font-medium text-gray-500 dark:text-slate-400 max-w-[200px]">
                There are no recently recorded visits to display.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-slate-800">
              {recentVisits.map((visit) => {
                const cfg = getStatusConfig(visit.status);
                const StatusIcon = cfg.icon;
                const visitorName = visit.visitor?.name ?? "Unknown";
                const initials = visitorName
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .substring(0, 2)
                  .toUpperCase();
                return (
                  <div
                    key={visit.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors duration-150"
                  >
                    <div className="w-9 h-9 rounded-[1.25rem] bg-gradient-to-br from-indigo-500 to-sky-500 text-white flex items-center justify-center font-bold text-sm shadow-inner shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {visitorName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                        {visit.purpose}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${cfg.className}`}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {formatDistanceToNow(new Date(visit.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
