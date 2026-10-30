import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/context/ToastContext";
import { LoadingBarProvider } from "@/context/LoadingBarContext";
import { TopProgressBar } from "@/components/ui/TopProgressBar";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Reeval ERP — Sistem Manufaktur Furnitur",
  description: "Aplikasi ERP Manufaktur Make-to-Order untuk pabrik dipan dan kasur. Kelola pengadaan, produksi, pengiriman, dan keuangan dalam satu platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0f2f5" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <LoadingBarProvider>
          <TopProgressBar />
          <ToastProvider>
            <AppProvider>
              <AppLayout>
                {children}
              </AppLayout>
            </AppProvider>
          </ToastProvider>
        </LoadingBarProvider>
      </body>
    </html>
  );
}
