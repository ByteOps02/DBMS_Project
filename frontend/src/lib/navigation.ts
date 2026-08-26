import {
  LayoutDashboard,
  UserPlus,
  QrCode,
  UploadCloud,
  KeyRound,
  ClipboardList,
  ShieldAlert,
} from "lucide-react";

export const navLinks = [
  {
    href: "/app/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["admin", "host", "guard", "visitor"],
  },
  {
    href: "/app/logs",
    label: "Visit Logs",
    icon: ClipboardList,
    roles: ["admin", "host", "guard", "visitor"],
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
    roles: ["admin", "host", "guard", "visitor"],
  },
];

