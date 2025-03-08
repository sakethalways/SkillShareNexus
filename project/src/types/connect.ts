export interface ConnectionRequest {
  id: string;
  user_id: string;
  nickname: string;
  location: string;
  interests: string[];
  status: 'searching' | 'connected';
  created_at: string;
  updated_at: string;
}

export interface ActiveConnection {
  id: string;
  user1_id: string;
  user2_id: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

export interface ConnectedUser {
  id: string;
  name: string;
  nickname: string;
  location: string;
  interests: string[];
  avatar_url?: string;
}