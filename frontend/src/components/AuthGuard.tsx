
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthGuard({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();

    const [authorized, setAuthorized] = useState(false);
    const [checking, setChecking] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function verifyAuthentication() {
            const token = localStorage.getItem("authToken");

            if (!token) {
                router.replace("/login");
                return;
            }

            try {
                const response = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/auth/me/`,
                    {
                        method: "GET",
                        headers: {
                            Authorization: `Token ${token}`,
                        },
                    }
                );

                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem("authToken");
                    localStorage.removeItem("user");

                    router.replace("/login");
                    return;
                }

                if (!response.ok) {
                    throw new Error("Could not verify your session.");
                }

                const user = await response.json();

                if (!active) return;

                localStorage.setItem("user", JSON.stringify(user));
                setAuthorized(true);

            } catch (err) {
                console.error("Authentication check failed:", err);

                if (active) {
                    setError(
                        "Unable to verify your login. Check your backend connection."
                    );
                }
            } finally {
                if (active) {
                    setChecking(false);
                }
            }
        }

        verifyAuthentication();

        return () => {
            active = false;
        };
    }, [router]);

    return (
        <div className="relative min-h-screen">

            {/* Keep children in the render tree */}
            <div
                style={{
                    visibility: authorized ? "visible" : "hidden",
                }}
                aria-hidden={!authorized}
                inert={!authorized}
            >
                {children}
            </div>

            {/* Authentication overlay */}
            {!authorized && (
                <div className="fixed inset-0 z-[9999] flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F7F9FC] text-slate-700">

                    {checking ? (
                        <>
                            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-[#1B4332]" />
                            <p>Checking authentication...</p>
                        </>
                    ) : error ? (
                        <>
                            <p>{error}</p>

                            <button
                                onClick={() => window.location.reload()}
                                className="rounded-lg bg-[#1B4332] px-5 py-2 text-white hover:bg-[#24563F]"
                            >
                                Retry
                            </button>
                        </>
                    ) : (
                        <p>Redirecting to login...</p>
                    )}

                </div>
            )}
        </div>
    );
}

