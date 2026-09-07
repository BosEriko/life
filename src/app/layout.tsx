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

const DESCRIPTION =
  "A private daily tracker for habits, hydration, nutrition, weight, blood pressure, and notes.";

export const metadata: Metadata = {
  metadataBase: new URL("https://life.boseriko.com"),
  applicationName: "Life Tracker",
  title: "Life Tracker",
  description: DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Life Tracker",
    title: "Life Tracker",
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Life Tracker",
    description: DESCRIPTION,
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
