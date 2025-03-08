// useAuth.ts - Custom hook for authentication
// /hooks/useAuth.ts
import { useSession } from "next-auth/react";

export function useAuth() {
  const { data: session, status } = useSession();
  return { user: session?.user, isAuthenticated: status === "authenticated" };
}
