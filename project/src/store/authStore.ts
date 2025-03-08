import { create } from 'zustand';
import { AuthState, User } from '../types/auth';
import { supabase } from '../lib/supabase';

interface AuthStore extends AuthState {
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  initialize: () => () => void; // Updated to return a cleanup function
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, loading: false, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  initialize: () => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        set({ error: error.message, loading: false });
        return;
      }

      if (!session) {
        set({ user: null, loading: false });
        return;
      }

      // Get user profile
      supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()
        .then(({ data: profile, error: profileError }) => {
          if (profileError) {
            set({ error: profileError.message, loading: false });
            return;
          }

          if (profile) {
            set({
              user: {
                id: session.user.id,
                email: session.user.email!,
                role: profile.role,
                name: profile.name,
                bio: profile.bio,
                avatar_url: profile.avatar_url,
                interests: profile.interests,
                skills: profile.skills,
                subject: profile.subject,
                created_at: profile.created_at,
              },
              loading: false,
            });
          } else {
            set({ user: null, loading: false });
          }
        });
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        set({ user: null, loading: false });
        return;
      }

      if (session) {
        supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile, error: profileError }) => {
            if (profileError) {
              set({ error: profileError.message, loading: false });
              return;
            }

            if (profile) {
              set({
                user: {
                  id: session.user.id,
                  email: session.user.email!,
                  role: profile.role,
                  name: profile.name,
                  bio: profile.bio,
                  avatar_url: profile.avatar_url,
                  interests: profile.interests,
                  skills: profile.skills,
                  subject: profile.subject,
                  created_at: profile.created_at,
                },
                loading: false,
              });
            }
          });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  },
}));