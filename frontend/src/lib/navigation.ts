import {
  LayoutDashboard,
  UserPlus,
  QrCode,
  UploadCloud,
  KeyRound,
  ClipboardList,
  ShieldAlert,
  Building,
  GraduationCap,
  PackageSearch,
  MonitorSmartphone,
} from "lucide-react";

export const navLinks = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "warden", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/hostel-hub",
    label: "Hostel Hub",
    icon: Building,
    roles: ["admin", "warden"],
  },
  {
    href: "/app/student-pass",
    label: "Student Pass",
    icon: GraduationCap,
    roles: ["student", "warden", "admin"],
  },
  {
    href: "/app/register-visit",
    label: "Register Visit",
    icon: UserPlus,
    roles: ["admin", "warden", "host", "guard", "visitor"],
  },

  {
    href: "/app/scan",
    label: "Gate Scanner",
    icon: QrCode,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/logs",
    label: "Visitor Logs",
    icon: ClipboardList,
    roles: ["admin", "warden", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/kiosk",
    label: "Reception Kiosk",
    icon: MonitorSmartphone,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/lost-and-found",
    label: "Lost & Found",
    icon: PackageSearch,
    roles: ["admin", "warden", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/blacklist",
    label: "Security Watchlist",
    icon: ShieldAlert,
    roles: ["admin", "warden", "guard"],
  },
  {
    href: "/app/bulk-visitor-upload",
    label: "Bulk Import",
    icon: UploadCloud,
    roles: ["admin", "warden"],
  },
  {
    href: "/app/change-password",
    label: "Security Settings",
    icon: KeyRound,
    roles: ["admin", "warden", "host", "guard", "visitor", "student"],
  },
];





