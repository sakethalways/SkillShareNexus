export type UserRole = 'learner' | 'tutor';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name: string;
  bio?: string;
  avatar_url?: string;
  interests?: string[];
  skills?: string[];
  subject?: string;
  created_at: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}