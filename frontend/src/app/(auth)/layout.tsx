import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "../globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sign in | Political Dashboard",
  description: "Sign in or create an account.",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    
        <main className="flex min-h-screen items-center justify-center px-4 py-12">
          <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            {children}
          </div>
        </main>
     
  );
}