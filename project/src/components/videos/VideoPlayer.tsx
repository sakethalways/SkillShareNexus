import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Star, ThumbsUp, MessageSquare, X, Loader, User, AlertCircle } from 'lucide-react';

interface VideoPlayerProps {
  videoId: string;
  videoUrl: string;
  onClose: () => void;
  onTimeUpdate?: (currentTime: number) => void;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  video_id: string;
  profiles: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

export const VideoPlayer = ({ videoId, videoUrl, onClose, onTimeUpdate }: VideoPlayerProps) => {
  const { user } = useAuthStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const pathMatch = videoUrl.match(/videos\/([^?#]+)/);
        if (!pathMatch) {
          throw new Error('Invalid video URL format');
        }
        const videoPath = pathMatch[1];

        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('videos')
          .createSignedUrl(videoPath, 3600);

        if (signedUrlError) {
          throw new Error('Video file not found or inaccessible: ' + signedUrlError.message);
        }

        if (!signedUrlData?.signedUrl) {
          throw new Error('Failed to generate video URL');
        }
        
        setSignedUrl(signedUrlData.signedUrl);

        const { data: ratingData } = await supabase
          .from('video_ratings')
          .select('rating')
          .eq('user_id', user?.id)
          .eq('video_id', videoId)
          .maybeSingle();

        if (ratingData) {
          setRating(ratingData.rating);
        }

        const { data: likeData } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user?.id)
          .eq('video_id', videoId)
          .maybeSingle();

        setLiked(!!likeData);

        const { data: commentsData, error: commentsError } = await supabase
          .from('comments')
          .select(`
            *,
            profiles:user_id (
              id,
              name,
              avatar_url
            )
          `)
          .eq('video_id', videoId)
          .order('created_at', { ascending: false });

        if (commentsError) throw commentsError;
        if (commentsData) {
          setComments(commentsData as Comment[]);
        }
      } catch (error: any) {
        console.error('Error fetching video data:', error);
        setError(error.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [videoId, user, videoUrl]);

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleRating = async (value: number) => {
    try {
      if (rating) {
        const { error } = await supabase
          .from('video_ratings')
          .update({ rating: value })
          .eq('user_id', user?.id)
          .eq('video_id', videoId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('video_ratings')
          .insert({
            user_id: user?.id,
            video_id: videoId,
            rating: value
          });

        if (error) throw error;
      }

      setRating(value);
    } catch (error: any) {
      console.error('Error rating video:', error);
      alert('Failed to save rating: ' + (error.message || 'Please try again'));
    }
  };

  const handleLike = async () => {
    try {
      if (liked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user?.id)
          .eq('video_id', videoId);

        if (error) throw error;
        setLiked(false);
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user?.id,
            video_id: videoId
          });

        if (error) throw error;
        setLiked(true);
      }
    } catch (error: any) {
      console.error('Error managing like:', error);
      alert('Failed to update like status: ' + (error.message || 'Please try again'));
    }
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          user_id: user?.id,
          video_id: videoId,
          content: newComment.trim()
        })
        .select(`
          *,
          profiles:user_id (name, avatar_url)
        `)
        .single();

      if (error) throw error;

      if (data) {
        setComments([data as Comment, ...comments]);
        setNewComment('');
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      alert('Failed to post comment: ' + (error.message || 'Please try again'));
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-gray-600">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md w-full mx-4 p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-medium">Error</h3>
          </div>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
        <div className="max-w-md w-full mx-4 p-6">
          <div className="flex items-center text-red-600 mb-4">
            <AlertCircle className="h-6 w-6 mr-2" />
            <h3 className="text-lg font-medium">Video Unavailable</h3>
          </div>
          <p className="text-gray-600 mb-6">This video is currently unavailable. Please try again later.</p>
          <button
            onClick={onClose}
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="w-full max-w-4xl mx-auto overflow-y-auto h-screen">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
        >
          <X className="h-6 w-6 text-gray-600" />
        </button>

        {/* Video Player */}
        <div className="w-full">
          <div className="aspect-video bg-gray-100">
            <video
              ref={videoRef}
              src={signedUrl}
              className="w-full h-full"
              controls
              controlsList="nodownload"
              autoPlay
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          {/* Rating and Like Section */}
          <div className="flex items-center justify-between mb-8 p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-lg font-semibold mb-2">Rate this video</h3>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleRating(value)}
                    className={`p-2 rounded-full ${
                      rating && rating >= value
                        ? 'text-yellow-500'
                        : 'text-gray-300'
                    }`}
                  >
                    <Star className="h-6 w-6 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleLike}
              className={`flex items-center justify-center p-3 rounded-lg ${
                liked
                  ? 'bg-red-100 text-red-600'
                  : 'bg-white text-gray-600 hover:bg-gray-100 border'
              }`}
            >
              <ThumbsUp className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
              <span className="ml-2">{liked ? 'Liked' : 'Like'}</span>
            </button>
          </div>

          {/* Comments Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Comments
            </h3>

            <form onSubmit={handleComment} className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full p-3 border rounded-lg resize-none"
                rows={3}
              />
              <button
                type="submit"
                disabled={!newComment.trim()}
                className="mt-2 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300"
              >
                Post Comment
              </button>
            </form>

            <div className="space-y-6">
              {comments.length > 0 ? (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.name}
                          className="h-10 w-10 rounded-full object-cover mr-3"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{comment.profiles?.name || 'Anonymous User'}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()} at{' '}
                          {new Date(comment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-6">
                  <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">No comments yet</p>
                  <p className="text-xs text-gray-400 mt-1">Be the first to comment!</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};