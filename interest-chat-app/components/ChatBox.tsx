"use client";

import { useState, useEffect } from "react";

// Define User and Match interfaces (same as in pages/chat.tsx)
interface User {
  id?: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  interests?: string[];
  location?: string;
}

interface Match {
  id: string;
  email: string;
}

// Define props for the ChatBox component
interface ChatBoxProps {
  user: User;
  match: Match;
}

export default function ChatBox({ user, match }: ChatBoxProps) {
  // Example usage of user and match props
  return (
    <div>
      <h1>Chat Box</h1>
      <p>User: {user.email}</p>
      <p>Match: {match.email}</p>
      {/* Add your chat UI here */}
    </div>
  );
}