import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppShell } from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Nexeta Petrol Pump Manager | باکمال پیٹرول پمپ مینیجر",
  description:
    "Automated petrol pump management SaaS system for Pakistani petrol pumps. Turso LibSQL database, live nozzle readings, udhar khata, tank dip khata, employee duties, and daily rates.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-800 min-h-screen antialiased selection:bg-indigo-600 selection:text-white">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
