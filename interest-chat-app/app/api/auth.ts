// /app/api/auth.ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import supabase from "lib/supabase";

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: Record<string, string> | undefined) {
        if (!credentials) throw new Error("No credentials provided");

        const { email, password } = credentials;

        // Fetch user from Supabase
        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (error || !user) throw new Error("User not found");

        // Return user object with additional properties
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          interests: user.interests || [], // Add interests (if available)
          location: user.location || "", // Add location (if available)
        };
      },
    }),
  ],
  callbacks: {
    async session({ session, token }: { session: any; token: any }) {
      // Add additional properties to the session.user object
      session.user.id = token.id;
      session.user.interests = token.interests; // Add interests
      session.user.location = token.location; // Add location
      return session;
    },
    async jwt({ token, user }: { token: any; user: any }) {
      // Add additional properties to the token object
      if (user) {
        token.id = user.id;
        token.interests = user.interests; // Add interests
        token.location = user.location; // Add location
      }
      return token;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);