import type { Metadata } from "next";
import { Rubik } from "next/font/google";
import { Toaster } from "sonner";
import { StoreProvider } from "@/lib/store";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const rubik = Rubik({ variable: "--font-rubik", subsets: ["hebrew", "latin"] });

export const metadata: Metadata = {
  title: "זיכרון בסלון — אב טיפוס",
  description: "אב טיפוס לגרסה המשודרגת של אתר זיכרון בסלון",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${rubik.variable} min-h-dvh`}>
        <StoreProvider>
          <SiteHeader />
          {children}
          <Toaster position="top-center" dir="rtl" richColors />
        </StoreProvider>
      </body>
    </html>
  );
}
