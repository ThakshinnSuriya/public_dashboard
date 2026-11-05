
import { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import AuthGuard from "@/components/AuthGuard";

export default function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center text-slate-600">
                    Loading application...
                </div>
            }
        >
            <AuthGuard>
                <div className="flex min-h-screen">
                    <Sidebar />

                    <div className="flex min-w-0 flex-1 flex-col">
                        <Header />

                        <main className="flex-1 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </AuthGuard>
        </Suspense>
    );
}
