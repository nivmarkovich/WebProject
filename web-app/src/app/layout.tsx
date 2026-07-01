// Root Layout — Hebrew RTL with premium design system
import type { Metadata } from "next";
import { Rubik, Heebo } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  weight: ["300", "400", "500", "600", "700", "800"],
});

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "LoRa Defi | רשת הצלה חכמה עם דפיברילטורים ניידים",
  description:
    "סימולטור רשת חירום המשתמש בטכנולוגיית LoRa ו-Meshtastic לשליחת התראות מצב חירום למתנדבים עם דפיברילטורים ניידים באזורים ללא קליטה סלולרית.",
  keywords: "LoRa, Meshtastic, דפיברילטור, חירום, מתנדבים, הצלה, רשת מש",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${rubik.variable} ${heebo.variable}`}>
      <body className="font-rubik antialiased bg-slate-950 text-white min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
