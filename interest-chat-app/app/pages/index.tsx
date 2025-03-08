// index.tsx - Main page
// /app/pages/index.tsx
"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  if (session) router.push("/chat");

  return (
    <div className="home-container">
      <button onClick={() => signIn("credentials")}>Login to Start Chatting</button>
    </div>
  );
}
