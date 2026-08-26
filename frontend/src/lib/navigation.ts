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
    roles: ["admin", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/hostel-hub",
    label: "Hostel & Outings",
    icon: Building,
    roles: ["admin", "host"],
  },
  {
    href: "/app/student-pass",
    label: "Student GatePass",
    icon: GraduationCap,
    roles: ["student", "visitor"],
  },
  {
    href: "/app/lost-and-found",
    label: "Lost & Found",
    icon: PackageSearch,
    roles: ["admin", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/kiosk",
    label: "Reception Kiosk",
    icon: MonitorSmartphone,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/logs",
    label: "Visit Logs",
    icon: ClipboardList,
    roles: ["admin", "host", "guard", "visitor", "student"],
  },
  {
    href: "/app/register-visit",
    label: "Register Visit",
    icon: UserPlus,
    roles: ["admin", "host", "guard", "visitor"],
  },

  {
    href: "/app/scan",
    label: "Scan QR Code",
    icon: QrCode,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/blacklist",
    label: "Blacklist Users",
    icon: ShieldAlert,
    roles: ["admin", "guard"],
  },
  {
    href: "/app/bulk-visitor-upload",
    label: "Bulk Upload",
    icon: UploadCloud,
    roles: ["admin", "host", "guard"],
  },
  {
    href: "/app/change-password",
    label: "Change Password",
    icon: KeyRound,
    roles: ["admin", "host", "guard", "visitor", "student"],
  },
];



