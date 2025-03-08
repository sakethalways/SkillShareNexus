"use client";

import { useState, useEffect } from "react";
import ChatBox from "components/ChatBox"; // Corrected import statement
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

// Extend the User type in next-auth
declare module "next-auth" {
  interface User {
    id?: string;
    interests?: string[];
    location?: string;
  }
}

// Define User interface with additional properties
interface User {
  id?: string; // Make `id` optional
  email?: string | null; // Make `email` optional
  name?: string | null;
  image?: string | null;
  interests?: string[]; // Add interests (optional)
  location?: string; // Add location (optional)
}

interface Match {
  id: string;
  email: string;
}

export default function Chat() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return; // Wait until session status is known

    // Check if session and session.user are available
    if (!session || !session.user) {
      router.push("/");
      return;
    }

    const findMatch = async () => {
      try {
        const response = await fetch("/api/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: session.user?.id || "", // Use optional chaining and provide a fallback
            interests: session.user?.interests || [], // Use optional chaining and provide a fallback
            location: session.user?.location || "", // Use optional chaining and provide a fallback
            email: session.user?.email || "", // Use optional chaining and provide a fallback
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to find a match");
        }

        const data = await response.json();
        setMatch(data.match);
      } catch (error) {
        console.error("Error finding match:", error);
      } finally {
        setLoading(false);
      }
    };

    findMatch();
  }, [session, status, router]);

  if (status === "loading" || loading) return <p>Finding a match...</p>;
  if (!match) return <p>No match found. Please try again later.</p>;

  // Ensure that session.user is not undefined before passing to ChatBox
  if (!session || !session.user) return <p>Error: User data not found</p>; // Ensure session and session.user are defined

  // Pass the session.user to ChatBox, ensuring it's compatible with the `User` type
  return <ChatBox user={session.user as User} match={match} />;
}