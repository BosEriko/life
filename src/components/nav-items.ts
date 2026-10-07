import {
  AppstoreOutlined,
  BarChartOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HeartOutlined,
  IdcardOutlined,
  MedicineBoxOutlined,
  ProjectOutlined,
  SafetyCertificateOutlined,
  ScheduleOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ComponentType } from "react";
import type { Accent } from "@/lib/accents";
import type { NavId } from "@/lib/nav-order";

export type NavItem = {
  id: NavId;
  key: string;
  label: string;
  accent: Accent;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

export const NAV: NavItem[] = [
  { id: "health", key: "/health", label: "Health", accent: "habits", Icon: HeartOutlined },
  { id: "journal", key: "/journal/notes", label: "Journal", accent: "notes", Icon: FileTextOutlined },
  { id: "finance", key: "/finance/dashboard", label: "Finance", accent: "water", Icon: WalletOutlined },
  { id: "records", key: "/records/database", label: "Records", accent: "sodium", Icon: DatabaseOutlined },
];

export type SubmenuTab = {
  href: string;
  label: string;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

export const SUBMENUS: Record<string, { label: string; tabs: SubmenuTab[] }> = {
  finance: {
    label: "Finance",
    tabs: [
      { href: "/finance/dashboard", label: "Dashboard", Icon: DashboardOutlined },
      { href: "/finance/accounts", label: "Accounts", Icon: WalletOutlined },
      { href: "/finance/records", label: "Records", Icon: UnorderedListOutlined },
      { href: "/finance/analytics", label: "Analytics", Icon: BarChartOutlined },
    ],
  },
  journal: {
    label: "Journal",
    tabs: [
      { href: "/journal/notes", label: "Notes", Icon: FileTextOutlined },
      { href: "/journal/tasks", label: "Tasks", Icon: ScheduleOutlined },
      { href: "/journal/todo", label: "To-do", Icon: CheckSquareOutlined },
      { href: "/journal/board", label: "Board", Icon: ProjectOutlined },
    ],
  },
  records: {
    label: "Records",
    tabs: [
      { href: "/records/database", label: "Database", Icon: DatabaseOutlined },
      { href: "/records/summary", label: "Summary", Icon: UnorderedListOutlined },
    ],
  },
};

export const PROFILE_SUBMENU: { label: string; tabs: SubmenuTab[] } = {
  label: "Profile",
  tabs: [
    { href: "/personal/details", label: "Personal", Icon: IdcardOutlined },
    { href: "/personal/medical", label: "Medical", Icon: MedicineBoxOutlined },
    { href: "/personal/app", label: "App", Icon: AppstoreOutlined },
    { href: "/personal/data", label: "Data & account", Icon: SafetyCertificateOutlined },
  ],
};

export function submenuFor(pathname: string) {
  return SUBMENUS[pathname.split("/")[1]] as { label: string; tabs: SubmenuTab[] } | undefined;
}
