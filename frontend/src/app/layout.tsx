
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Political Dashboard",
  description:
    "A workspace for research, analytics, and organization management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-screen bg-[#F7F9FC]">
        <div className="flex min-h-screen">
          <Sidebar />

          <div className="flex min-w-0 flex-1 flex-col">
            <Header />

            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
