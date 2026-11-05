// "use client";

// import { useState } from "react";
// import Link from "next/link";

// export default function Register() {
//     const [username, setUsername] = useState("");
//     const [email, setEmail] = useState("");
//     const [password, setPassword] = useState("");
//     const [message, setMessage] = useState("");
//     const [isError, setIsError] = useState(false);
//     const [loading, setLoading] = useState(false);

//     async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
//         event.preventDefault();

//         setLoading(true);
//         setMessage("");
//         setIsError(false);

//         try {
//             const response = await fetch(
//                 `${process.env.NEXT_PUBLIC_API_URL}/auth/register/`,
//                 {
//                     method: "POST",
//                     headers: {
//                         "Content-Type": "application/json",
//                     },
//                     body: JSON.stringify({
//                         username,
//                         email,
//                         password,
//                     }),
//                 }
//             );

//             const data = await response.json();

//             if (!response.ok) {
//                 const errorMessage =
//                     typeof data.error === "string"
//                         ? data.error
//                         : Array.isArray(data.error)
//                           ? data.error.join(" ")
//                           : "Registration failed.";

//                 setMessage(errorMessage);
//                 setIsError(true);
//                 return;
//             }

//             setMessage("Account created successfully! You can now log in.");
//             setUsername("");
//             setEmail("");
//             setPassword("");
//         } catch (error) {
//             setMessage(
//                 "Could not connect to the backend. Check whether Django is running."
//             );
//             setIsError(true);
//             console.error(error);
//         } finally {
//             setLoading(false);
//         }
//     }

   
//         return (
//             <main className="auth-page">
//                 <section className="auth-card">
//                     <h1 className="auth-title">Create Account</h1>

//                     <p className="auth-subtitle">
//                         Create your account to access Political Dashboard.
//                     </p>

//                     <form className="auth-form" onSubmit={handleRegister}>
//                         <label className="auth-field" htmlFor="username">
//                             Username
//                         </label>
//                         <input
//                             className="auth-input"
//                             id="username"
//                             type="text"
//                             placeholder="Enter your username"
//                             value={username}
//                             onChange={(event) => setUsername(event.target.value)}
//                             required
//                         />

//                         <label className="auth-field" htmlFor="email">
//                             Email address
//                         </label>
//                         <input
//                             className="auth-input"
//                             id="email"
//                             type="email"
//                             placeholder="you@example.com"
//                             value={email}
//                             onChange={(event) => setEmail(event.target.value)}
//                             required
//                         />

//                         <label className="auth-field" htmlFor="password">
//                             Password
//                         </label>
//                         <input
//                             className="auth-input"
//                             id="password"
//                             type="password"
//                             placeholder="Create a strong password"
//                             value={password}
//                             onChange={(event) => setPassword(event.target.value)}
//                             required
//                         />

//                         <button
//                             className="auth-button"
//                             type="submit"
//                             disabled={loading}
//                         >
//                             {loading ? "Creating account..." : "Create Account"}
//                         </button>
//                     </form>

//                     {message && (
//                         <p className="auth-message" role="status">
//                             {message}
//                         </p>
//                     )}

//                     <p className="auth-footer">
//                         Already have an account?{" "}
//                         <a className="auth-link" href="/login">
//                             Sign in
//                         </a>
//                     </p>
//                 </section>
//             </main>
//         );

// }
"use client"
export default function register(){
    return(
        <div>
            <center>
                <h1>
                    Register page coming soon...
                </h1>
                <h3>
                    Now only invited persons can join
                </h3>
            </center>
        </div>
    );
}