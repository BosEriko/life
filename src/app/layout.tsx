import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "antd/dist/reset.css";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import { AuthGuard } from "@/components/auth-guard";
import { SwRegister } from "@/components/sw-register";
import { ThemeProvider } from "@/components/theme-provider";

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Life Tracker",
  description: "Personal homepage",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#316342",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={sans.variable}>
      <body>
        <SwRegister />
        <AntdRegistry>
          <ThemeProvider>
            <AuthProvider>
              <AuthGuard>{children}</AuthGuard>
            </AuthProvider>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
