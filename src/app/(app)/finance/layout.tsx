import { FinanceAutoRecalculate } from "@/components/finance-auto-recalculate";

export default function FinanceLayout({ children }: LayoutProps<"/finance">) {
  return (
    <>
      <FinanceAutoRecalculate />
      {children}
    </>
  );
}
