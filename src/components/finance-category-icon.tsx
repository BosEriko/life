"use client";

import type { CSSProperties } from "react";
import {
  AppstoreOutlined,
  BankOutlined,
  CreditCardOutlined,
  EllipsisOutlined,
  FundOutlined,
  SafetyOutlined,
  WalletOutlined,
  CarOutlined,
  CoffeeOutlined,
  DollarOutlined,
  FileTextOutlined,
  GiftOutlined,
  HomeOutlined,
  MedicineBoxOutlined,
  PlaySquareOutlined,
  ReadOutlined,
  ShoppingOutlined,
  SwapOutlined,
  TagOutlined,
} from "@ant-design/icons";

const ICONS: Record<string, typeof TagOutlined> = {
  "Food & drink": CoffeeOutlined,
  Shopping: ShoppingOutlined,
  Housing: HomeOutlined,
  Transportation: CarOutlined,
  Health: MedicineBoxOutlined,
  Entertainment: PlaySquareOutlined,
  Education: ReadOutlined,
  Bills: FileTextOutlined,
  Salary: DollarOutlined,
  Gifts: GiftOutlined,
  Other: AppstoreOutlined,
  Transfer: SwapOutlined,
};

export function CategoryIcon({ category, style }: { category: string; style?: CSSProperties }) {
  const Icon = ICONS[category] ?? TagOutlined;
  return <Icon aria-hidden style={style} />;
}

const ACCOUNT_TYPE_ICONS: Record<string, typeof TagOutlined> = {
  Cash: WalletOutlined,
  "Bank account": BankOutlined,
  Savings: SafetyOutlined,
  "Credit card": CreditCardOutlined,
  Investment: FundOutlined,
  Loan: DollarOutlined,
  Other: EllipsisOutlined,
};

export function AccountTypeIcon({ type, style }: { type: string; style?: CSSProperties }) {
  const Icon = ACCOUNT_TYPE_ICONS[type] ?? WalletOutlined;
  return <Icon aria-hidden style={style} />;
}
