"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
    const router = useRouter();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
   

    async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setLoading(true);
        setMessage("");

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/auth/login/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        username: username,
                        password: password,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Login failed.");
                return;
            }

            setMessage("Login successful!");

            // Save authentication token
            localStorage.setItem("authToken", data.token);

            // Save user information
            localStorage.setItem("user", JSON.stringify(data.user));

            // Redirect to dashboard
            router.push("/dashboard");
        } catch (error) {
            setMessage(
                "Could not connect to the backend. Check whether Django is running."
            );
            console.error(error);
        } finally {
            setLoading(false);
        }
    }

        
        return (
            <main className="auth-page">
                <section className="auth-card">
                    <h1 className="auth-title">Welcome Back</h1>

                    <p className="auth-subtitle">
                        Sign in to continue to Political Dashboard.
                    </p>

                    <form className="auth-form" onSubmit={handleLogin}>
                        <label className="auth-field" htmlFor="username">
                            Username
                        </label>
                        <input
                            className="auth-input"
                            id="username"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(event) => setUsername(event.target.value)}
                            required
                        />
                        
                        <label className="auth-field" htmlFor="password">
                            Password
                        </label>
                        <input
                            className="auth-input"
                            id="password"
                            type="password"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            required
                        />

                        <button
                            className="auth-button"
                            type="submit"
                            disabled={loading}
                        >
                            {loading ? "Logging in..." : "Sign In"}
                        </button>
                    </form>

                    {message && (
                        <p className="auth-message" role="status">
                            {message}
                        </p>
                    )}

                    {/* <p className="auth-footer">
                        Don't have an account?{" "}
                        <a className="auth-link" href="/register">
                            Create one
                        </a>
                    </p> */}
                </section>
            </main>
        );

}