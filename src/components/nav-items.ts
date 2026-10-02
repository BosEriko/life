import {
  DatabaseOutlined,
  FileTextOutlined,
  HeartOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ComponentType } from "react";

export type NavItem = {
  key: string;
  label: string;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

export const NAV: NavItem[] = [
  { key: "/", label: "Health", Icon: HeartOutlined },
  { key: "/journal/notes", label: "Journal", Icon: FileTextOutlined },
  { key: "/finance/dashboard", label: "Finance", Icon: WalletOutlined },
  { key: "/records/database", label: "Records", Icon: DatabaseOutlined },
];
