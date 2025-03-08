// /app/api/chat.ts
import  supabase  from "lib/supabase";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    const { senderId, receiverId, message } = req.body;

    const { error } = await supabase.from("messages").insert([{ senderId, receiverId, message }]);

    if (error) return res.status(500).json({ error: error.message });

    return res.status(201).json({ message: "Message sent" });
  }

  if (req.method === "GET") {
    const { senderId, receiverId } = req.query;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(`(senderId.eq.${senderId},receiverId.eq.${receiverId}), (senderId.eq.${receiverId},receiverId.eq.${senderId})`)
      .order("created_at", { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json(data);
  }

  res.status(405).json({ message: "Method Not Allowed" });
}
