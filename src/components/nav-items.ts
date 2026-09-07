import {
  FileTextOutlined,
  HeartOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { CSSProperties, ComponentType } from "react";

export type NavItem = {
  key: string;
  label: string;
  Icon: ComponentType<{ style?: CSSProperties }>;
};

export const NAV: NavItem[] = [
  { key: "/", label: "Health", Icon: HeartOutlined },
  { key: "/notes", label: "Notes", Icon: FileTextOutlined },
  { key: "/summary", label: "Summary", Icon: UnorderedListOutlined },
];
