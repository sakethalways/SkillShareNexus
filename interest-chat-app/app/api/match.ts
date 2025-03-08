// /app/api/match.ts
import  supabase  from "lib/supabase";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method Not Allowed" });

  const { userId, interests, location } = req.body;

  const { data: users, error } = await supabase
    .from("users")
    .select("id, interests, location")
    .neq("id", userId);

  if (error) return res.status(500).json({ error: error.message });

  const match = users.find(
    (user) => user.interests.some((interest: string) => interests.includes(interest)) && user.location === location
  );

  if (!match) return res.status(404).json({ message: "No match found" });

  res.status(200).json({ match });
}
