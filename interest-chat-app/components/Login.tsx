// /app/components/Login.tsx
"use client";

import { signIn } from "next-auth/react";

export default function Login() {
  return (
    <div className="login-container">
      <h2>Welcome to Chat App</h2>
      <button onClick={() => signIn("google")}>Login with Google</button>
    </div>
  );
}
