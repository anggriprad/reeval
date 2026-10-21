import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { ToastProvider } from "@/context/ToastContext";
import { AppLayout } from "@/components/layout/AppLayout";

export const metadata: Metadata = {
  title: "Reeval ERP — Sistem Manufaktur Furnitur",
  description: "Aplikasi ERP Manufaktur Make-to-Order untuk pabrik dipan dan kasur. Kelola pengadaan, produksi, pengiriman, dan keuangan dalam satu platform.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark" suppressHydrationWarning>
      <body className="font-sans antialiased">
        <ToastProvider>
          <AppProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </AppProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
