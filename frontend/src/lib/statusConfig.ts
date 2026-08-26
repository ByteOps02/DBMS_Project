import { Clock3, CheckCircle2, XCircle, LogIn, CheckCheck, Ban } from "lucide-react";

export const STATUS_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; className: string }
> = {
  pending: {
    label: "Pending",
    icon: Clock3,
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  denied: {
    label: "Denied",
    icon: XCircle,
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  completed: {
    label: "Completed",
    icon: CheckCheck,
    className: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
  checked_in: {
    label: "Checked In",
    icon: LogIn,
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    className: "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400",
  },
};

export function getStatusConfig(
  status: string
): (typeof STATUS_CONFIG)[keyof typeof STATUS_CONFIG] {
  return STATUS_CONFIG[status] || STATUS_CONFIG["pending"];
}

