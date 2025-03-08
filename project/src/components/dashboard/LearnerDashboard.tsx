import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Video, BookOpen, Star, Clock, User, GraduationCap } from 'lucide-react';
import { VideoWithTutor, EnrollmentResponse, BookmarkResponse } from '../../types/video';
import { VideoPlayer } from '../videos/VideoPlayer';

const LearnerDashboard = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolledVideos, setEnrolledVideos] = useState<VideoWithTutor[]>([]);
  const [bookmarkedVideos, setBookmarkedVideos] = useState<VideoWithTutor[]>([]);
  const [totalWatchTime, setTotalWatchTime] = useState(0);
  const [currentVideo, setCurrentVideo] = useState<VideoWithTutor | null>(null);

  const formatWatchTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleVideoClick = async (video: VideoWithTutor) => {
    try {
      const pathMatch = video.url.match(/videos\/([^?#]+)/);
      if (!pathMatch) {
        throw new Error('Invalid video URL format');
      }
      const videoPath = pathMatch[1];

      const { error: signedUrlError } = await supabase
        .storage
        .from('videos')
        .createSignedUrl(videoPath, 10);

      if (signedUrlError) {
        if (signedUrlError.message.includes('400') || signedUrlError.message.includes('404')) {
          setEnrolledVideos((videos) => videos.filter((v) => v.id !== video.id));
          setBookmarkedVideos((videos) => videos.filter((v) => v.id !== video.id));
          throw new Error('This video is no longer available. It may have been removed by the tutor.');
        }
        throw signedUrlError;
      }

      setCurrentVideo(video);
    } catch (error: any) {
      console.error('Error accessing video:', error);
      alert(error.message || 'Unable to play video. Please try again later.');
    }
  };

  const handleCloseVideo = () => {
    setCurrentVideo(null);
  };

  const handleTimeUpdate = async (videoId: string, currentTime: number) => {
    try {
      const { error } = await supabase
        .from('enrollments')
        .update({
          last_position: Math.floor(currentTime),
          watch_time: Math.floor(currentTime),
        })
        .eq('user_id', user?.id)
        .eq('video_id', videoId);

      if (error) throw error;

      setEnrolledVideos((videos) =>
        videos.map((v) =>
          v.id === videoId ? { ...v, watch_time: Math.floor(currentTime), last_position: Math.floor(currentTime) } : v
        )
      );

      setTotalWatchTime((prev) => {
        const video = enrolledVideos.find((v) => v.id === videoId);
        const oldTime = video?.watch_time || 0;
        const timeDiff = Math.floor(currentTime) - oldTime;
        return prev + timeDiff;
      });
    } catch (error) {
      console.error('Error updating watch time:', error);
    }
  };

  const handleDisenroll = async (videoId: string) => {
    if (!confirm('Are you sure you want to disenroll from this course? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('user_id', user?.id)
        .eq('video_id', videoId);

      if (error) throw error;

      setEnrolledVideos((videos) => videos.filter((v) => v.id !== videoId));

      const { error: bookmarkError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user?.id)
        .eq('video_id', videoId);

      if (bookmarkError) {
        console.error('Error removing bookmark:', bookmarkError);
      }

      setBookmarkedVideos((videos) => videos.filter((v) => v.id !== videoId));
    } catch (error) {
      console.error('Error disenrolling:', error);
      alert('Failed to disenroll from the course');
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'learner') return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: enrollments, error: enrollmentsError } = await supabase
          .from('enrollments')
          .select(`
            video_id,
            watch_time,
            last_position,
            videos (
              id,
              title,
              description,
              url,
              thumbnail_url,
              category,
              difficulty_level,
              tutor_id,
              created_at,
              updated_at,
              profiles:tutor_id (name, avatar_url),
              video_ratings!video_ratings_video_id_fkey (rating),
              likes (count),
              comments (count),
              enrollments (user_id)
            )
          `)
          .eq('user_id', user.id) as { data: EnrollmentResponse[] | null; error: any };

        if (enrollmentsError) throw enrollmentsError;

        const totalSeconds = enrollments?.reduce((sum, e) => sum + (e.watch_time || 0), 0) || 0;
        setTotalWatchTime(totalSeconds);

        const transformedEnrolledVideos: VideoWithTutor[] = (enrollments || [])
          .filter((e) => e.videos)
          .map((e) => {
            const video = e.videos;
            const ratings = video.video_ratings || [];
            const ratingSum = ratings.reduce((sum, r) => sum + r.rating, 0);
            const ratingAvg = ratings.length > 0 ? ratingSum / ratings.length : 0;

            return {
              id: video.id,
              title: video.title,
              description: video.description,
              url: video.url,
              thumbnail_url: video.thumbnail_url,
              category: video.category,
              difficulty_level: video.difficulty_level,
              tutor_id: video.tutor_id,
              created_at: video.created_at,
              updated_at: video.updated_at,
              tutor_name: video.profiles.name,
              tutor_avatar_url: video.profiles.avatar_url,
              rating_average: ratingAvg,
              rating_count: ratings.length,
              students_count: video.enrollments.length, // Now fetched in query
              is_enrolled: true,
              is_bookmarked: false,
              watch_time: e.watch_time || 0, // Required by VideoWithTutor
              last_position: e.last_position || 0, // Required by VideoWithTutor
            };
          });

        setEnrolledVideos(transformedEnrolledVideos);

        const { data: bookmarks, error: bookmarksError } = await supabase
          .from('bookmarks')
          .select(`
            video_id,
            videos (
              id,
              title,
              description,
              url,
              thumbnail_url,
              category,
              difficulty_level,
              tutor_id,
              created_at,
              updated_at,
              profiles:tutor_id (name, avatar_url),
              video_ratings!video_ratings_video_id_fkey (rating),
              likes (count),
              comments (count),
              enrollments (user_id)
            )
          `)
          .eq('user_id', user.id) as { data: BookmarkResponse[] | null; error: any };

        if (bookmarksError) throw bookmarksError;

        const transformedBookmarkedVideos: VideoWithTutor[] = (bookmarks || [])
          .filter((b) => b.videos)
          .map((b) => {
            const video = b.videos;
            const ratings = video.video_ratings || [];
            const ratingSum = ratings.reduce((sum, r) => sum + r.rating, 0);
            const ratingAvg = ratings.length > 0 ? ratingSum / ratings.length : 0;

            return {
              id: video.id,
              title: video.title,
              description: video.description,
              url: video.url,
              thumbnail_url: video.thumbnail_url,
              category: video.category,
              difficulty_level: video.difficulty_level,
              tutor_id: video.tutor_id,
              created_at: video.created_at,
              updated_at: video.updated_at,
              tutor_name: video.profiles.name,
              tutor_avatar_url: video.profiles.avatar_url,
              rating_average: ratingAvg,
              rating_count: ratings.length,
              students_count: video.enrollments.length, // Reflects total enrollments
              is_enrolled: transformedEnrolledVideos.some((v) => v.id === video.id), // Check if enrolled
              is_bookmarked: true,
              watch_time: transformedEnrolledVideos.find((v) => v.id === video.id)?.watch_time || 0,
              last_position: transformedEnrolledVideos.find((v) => v.id === video.id)?.last_position || 0,
            };
          });

        setBookmarkedVideos(transformedBookmarkedVideos);
      } catch (error: any) {
        console.error('Error fetching learner data:', error);
        setError(error.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (!user || user.role !== 'learner') {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <GraduationCap className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Only learners can access this dashboard. Please sign in as a learner to view your learning progress.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
              <p className="mt-1 text-sm text-gray-900">
                Here's what's happening with your learning journey today
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to="/courses"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <BookOpen className="h-5 w-5 mr-2" />
                Browse Courses
              </Link>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    <GraduationCap className="h-3 w-3 mr-1" />
                    Learner
                  </span>
                  <Link
                    to="/profile"
                    className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm font-medium"
                  >
                    Edit Profile
                  </Link>
                </div>

                <div className="mt-2">
                  <div className="flex items-center text-gray-700">
                    <User className="h-4 w-4 mr-2 text-indigo-600" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                </div>

                {user.bio && <p className="mt-2 text-sm text-gray-600">{user.bio}</p>}

                {user.interests && user.interests.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Interests</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.interests.map((interest, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Enrolled Courses</h3>
                <p className="text-2xl font-semibold">{enrolledVideos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Bookmarked</h3>
                <p className="text-2xl font-semibold">{bookmarkedVideos.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Learning Time</h3>
                <p className="text-2xl font-semibold">{formatWatchTime(totalWatchTime)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <Video className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold">My Courses</h3>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : enrolledVideos.length > 0 ? (
              <div className="space-y-4">
                {enrolledVideos.map((video) => (
                  <div key={video.id} className="flex border rounded-lg overflow-hidden">
                    <div className="w-1/3 h-24">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="w-2/3 p-3">
                      <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                      <p className="text-xs text-gray-500">{video.tutor_name}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 text-sm">{video.rating_average.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({video.rating_count} {video.rating_count === 1 ? 'rating' : 'ratings'})
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-xs text-gray-500">
                          Watched: {formatWatchTime(video.watch_time)}
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleVideoClick(video)}
                            className="text-sm text-indigo-600 hover:text-indigo-500"
                          >
                            Watch Video
                          </button>
                          <button
                            onClick={() => handleDisenroll(video.id)}
                            className="text-sm text-red-600 hover:text-red-500"
                          >
                            Disenroll
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No enrolled courses yet</p>
                <p className="text-xs text-gray-400 mt-1">Browse courses to start learning</p>
                <Link
                  to="/courses"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Browse Courses
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <BookOpen className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-lg font-semibold">Bookmarked Courses</h3>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-gray-200 rounded"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            ) : bookmarkedVideos.length > 0 ? (
              <div className="space-y-4">
                {bookmarkedVideos.map((video) => (
                  <div key={video.id} className="flex border rounded-lg overflow-hidden">
                    <div className="w-1/3 h-24">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                          <Video className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="w-2/3 p-3">
                      <h4 className="font-medium text-sm line-clamp-1">{video.title}</h4>
                      <p className="text-xs text-gray-500">{video.tutor_name}</p>
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex items-center text-yellow-500">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 text-sm">{video.rating_average.toFixed(1)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          ({video.rating_count} {video.rating_count === 1 ? 'rating' : 'ratings'})
                        </span>
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => handleVideoClick(video)}
                          className="text-sm text-indigo-600 hover:text-indigo-500"
                        >
                          Watch Video
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <BookOpen className="mx-auto h-10 w-10 text-gray-400" />
                <p className="mt-2 text-sm text-gray-500">No bookmarked courses yet</p>
                <p className="text-xs text-gray-400 mt-1">Bookmark courses to watch them later</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {currentVideo && (
        <VideoPlayer
          videoId={currentVideo.id}
          videoUrl={currentVideo.url}
          onClose={handleCloseVideo}
          onTimeUpdate={(currentTime) => handleTimeUpdate(currentVideo.id, currentTime)}
        />
      )}
    </div>
  );
};

export default LearnerDashboard;