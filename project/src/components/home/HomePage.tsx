import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, BookOpen, Star, Clock, Tag, User, Video as VideoIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Video } from '../../types/video';

interface VideoWithStats extends Video {
  tutor_name: string;
  tutor_avatar_url: string | null;
  rating_average: number;
  rating_count: number;
  students_count: number;
  views_count: number;
}

export const HomePage = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [videos, setVideos] = useState<VideoWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // For tutors, fetch all videos. For learners, keep existing behavior
        const query = supabase
          .from('videos')
          .select(`
            *,
            profiles:tutor_id (
              name,
              avatar_url
            ),
            video_ratings!video_ratings_video_id_fkey (rating),
            enrollments (count),
            likes (count)
          `);

        // Only filter by tutor_id if the user is a tutor viewing their own videos
        const { data: videosData, error: videosError } = await query;
        
        if (videosError) throw videosError;
        
        if (videosData) {
          const transformedVideos = videosData.map((video: any) => {
            const ratings = video.video_ratings || [];
            const ratingSum = ratings.reduce((sum: number, r: any) => sum + r.rating, 0);
            const ratingAvg = ratings.length > 0 ? ratingSum / ratings.length : 0;
            const studentsCount = video.enrollments?.length || 0;
            
            return {
              ...video,
              tutor_name: video.profiles?.name || 'Unknown Tutor',
              tutor_avatar_url: video.profiles?.avatar_url || null,
              rating_average: ratingAvg,
              rating_count: ratings.length,
              students_count: studentsCount,
              views_count: studentsCount * 3 // Mock view count based on enrollments
            };
          });
          
          setVideos(transformedVideos);
        }
      } catch (error: any) {
        console.error('Error fetching videos:', error);
        setError(error.message || 'Failed to load videos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideos();
  }, [user]);

  const filteredVideos = videos.filter((video) => {
    const searchTermLower = searchTerm.toLowerCase();
    return video.title.toLowerCase().includes(searchTermLower) || 
           (video.description && video.description.toLowerCase().includes(searchTermLower));
  });

  // Sort videos by rating and view count
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    // First sort by rating
    const ratingDiff = b.rating_average - a.rating_average;
    if (ratingDiff !== 0) return ratingDiff;
    // Then by views if ratings are equal
    return b.views_count - a.views_count;
  });

  // For tutors, filter their own videos for the "Your Videos" section
  const tutorVideos = user?.role === 'tutor' ? sortedVideos.filter(video => video.tutor_id === user.id) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-indigo-700 text-white relative">
        <div className="absolute top-0 right-0 mt-4 mr-4">
          <Link
            to="/about"
            className="text-white hover:text-indigo-200 font-medium"
          >
            About Us
          </Link>
        </div>
        <div className="max-w-7xl mx-auto py-16 px-4 sm:py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold sm:text-5xl sm:tracking-tight lg:text-6xl">
              {user?.role === 'tutor' 
                ? 'Welcome to Your Teaching Hub' 
                : 'Discover Your Next Learning Adventure'}
            </h1>
            <p className="mt-6 max-w-2xl mx-auto text-xl">
              {user?.role === 'tutor'
                ? 'Share your knowledge and inspire learners from around the world'
                : 'Explore courses taught by expert instructors from around the world'}
            </p>
            
            <div className="mt-10 max-w-xl mx-auto">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-transparent rounded-md leading-5 bg-white text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-indigo-700 focus:ring-white"
                  placeholder="Search videos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {user?.role === 'tutor' && (
              <div className="mt-8">
                <Link
                  to="/tutor/upload-video"
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-white hover:bg-indigo-50"
                >
                  <VideoIcon className="h-5 w-5 mr-2" />
                  Upload New Video
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {user?.role === 'tutor' && tutorVideos.length > 0 && (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Your Videos</h2>
              <Link
                to="/tutor/videos"
                className="text-indigo-600 hover:text-indigo-900 font-medium"
              >
                Manage Your Videos
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-12">
              {tutorVideos.map((video) => (
                <div key={video.id} className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="relative pb-2/3">
                    {video.thumbnail_url ? (
                      <img
                        className="h-48 w-full object-cover"
                        src={video.thumbnail_url}
                        alt={video.title}
                      />
                    ) : (
                      <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                        <BookOpen className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-center space-x-1 text-sm text-yellow-500 mb-1">
                      <Star className="h-4 w-4 fill-current" />
                      <span>{video.rating_average.toFixed(1)}</span>
                      <span className="text-gray-500">({video.rating_count} ratings)</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                      {video.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 line-clamp-2">{video.description}</p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {video.category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                            <Tag className="h-3 w-3 mr-1" />
                            {video.category}
                          </span>
                        )}
                        {video.difficulty_level && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Clock className="h-3 w-3 mr-1" />
                            {video.difficulty_level}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-900">{video.views_count}</p>
                        <p className="text-xs text-gray-500">Views</p>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <p className="text-sm font-medium text-gray-900">{video.students_count}</p>
                        <p className="text-xs text-gray-500">Students</p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <Link
                        to={`/tutor/videos/edit/${video.id}`}
                        className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                      >
                        Edit Video
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            {user?.role === 'tutor' ? 'All Videos on Platform' : 'Featured Courses'}
          </h2>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading videos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 bg-red-50 rounded-lg">
            <p className="text-red-500">{error}</p>
          </div>
        ) : sortedVideos.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900">No videos found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {videos.length === 0 
                ? "No videos have been uploaded yet. Check back later!"
                : "Try adjusting your search criteria."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedVideos.map((video) => (
              <div key={video.id} className="bg-white overflow-hidden shadow rounded-lg">
                <div className="relative pb-2/3">
                  {video.thumbnail_url ? (
                    <img
                      className="h-48 w-full object-cover"
                      src={video.thumbnail_url}
                      alt={video.title}
                    />
                  ) : (
                    <div className="h-48 w-full bg-gray-200 flex items-center justify-center">
                      <BookOpen className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center space-x-1 text-sm text-yellow-500 mb-1">
                    <Star className="h-4 w-4 fill-current" />
                    <span>{video.rating_average.toFixed(1)}</span>
                    <span className="text-gray-500">({video.rating_count} ratings)</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 leading-tight">
                    {video.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">{video.description}</p>
                  
                  <div className="mt-4 flex items-center">
                    {video.tutor_avatar_url ? (
                      <img
                        className="h-8 w-8 rounded-full mr-2 object-cover"
                        src={video.tutor_avatar_url}
                        alt={video.tutor_name}
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center mr-2">
                        <User className="h-4 w-4 text-gray-500" />
                      </div>
                    )}
                    <span className="text-sm text-gray-700">{video.tutor_name}</span>
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {video.category && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          <Tag className="h-3 w-3 mr-1" />
                          {video.category}
                        </span>
                      )}
                      {video.difficulty_level && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <Clock className="h-3 w-3 mr-1" />
                          {video.difficulty_level}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">{video.views_count}</p>
                      <p className="text-xs text-gray-500">Views</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded">
                      <p className="text-sm font-medium text-gray-900">{video.students_count}</p>
                      <p className="text-xs text-gray-500">Students</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};