export interface Video {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  category?: string;
  difficulty_level?: string;
  tutor_id: string;
  created_at: string;
  updated_at: string;
}

export interface VideoWithTutor extends Video {
  tutor_name: string;
  tutor_avatar_url: string | null;
  rating_average: number;
  rating_count: number;
  students_count: number;
  is_enrolled: boolean;
  is_bookmarked: boolean;
  watch_time: number;
  last_position: number;
}

export interface Enrollment {
  id: string;
  user_id: string;
  video_id: string;
  progress: number;
  completed: boolean;
  watch_time: number;
  last_position: number;
  created_at: string;
  updated_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface Like {
  id: string;
  user_id: string;
  video_id: string;
  created_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  video_id: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface StorageError extends Error {
  status?: number;
}

export interface VideoResponse {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  category?: string;
  difficulty_level?: string;
  tutor_id: string;
  created_at: string;
  updated_at: string;
  profiles: {
    name: string;
    avatar_url: string | null;
  };
  video_ratings: Array<{ rating: number }>;
  enrollments: Array<any>;
  likes: { count: number };
  comments: { count: number };
}

export interface EnrollmentResponse {
  video_id: string;
  watch_time: number;
  last_position: number;
  videos: VideoResponse;
}

export interface BookmarkResponse {
  video_id: string;
  videos: VideoResponse;
}