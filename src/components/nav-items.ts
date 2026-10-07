import {
  BarChartOutlined,
  CheckSquareOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  FileTextOutlined,
  HeartOutlined,
  ProjectOutlined,
  ScheduleOutlined,
  UnorderedListOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ComponentType } from "react";
import type { Accent } from "@/lib/accents";

export type NavItem = {
  key: string;
  label: string;
  accent: Accent;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

export const NAV: NavItem[] = [
  { key: "/", label: "Health", accent: "habits", Icon: HeartOutlined },
  { key: "/journal/notes", label: "Journal", accent: "notes", Icon: FileTextOutlined },
  { key: "/finance/dashboard", label: "Finance", accent: "water", Icon: WalletOutlined },
  { key: "/records/database", label: "Records", accent: "sodium", Icon: DatabaseOutlined },
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

export function submenuFor(pathname: string) {
  return SUBMENUS[pathname.split("/")[1]] as { label: string; tabs: SubmenuTab[] } | undefined;
}
