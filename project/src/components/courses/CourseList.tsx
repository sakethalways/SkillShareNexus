import  { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search, BookOpen, Star, Clock, Tag, User } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import { Video } from '../../types/video';
import { VideoPlayer } from '../videos/VideoPlayer';

// Categories for filtering
const CATEGORIES = [
  'All Categories',
  'Web Development',
  'Data Science',
  'Mobile Development',
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Other',
];

// Levels for filtering
const LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];

type SortOption = 'popularity' | 'rating' | 'newest';

interface VideoWithTutor extends Video {
  tutor_name: string;
  tutor_avatar_url: string | null;
  rating_average: number;
  rating_count: number;
  students_count: number;
  is_enrolled: boolean;
  is_bookmarked: boolean;
}

export const CourseList = () => {
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedLevel, setSelectedLevel] = useState('All Levels');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [videos, setVideos] = useState<VideoWithTutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<VideoWithTutor | null>(null);
  const location = useLocation();

  useEffect(() => {
    // Get search term from URL if present
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [location.search]);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: videosData, error: videosError } = await supabase
          .from('videos')
          .select(`
            *,
            profiles:tutor_id (
              name,
              avatar_url
            ),
            video_ratings!video_ratings_video_id_fkey (rating),
            enrollments (count)
          `);
        
        if (videosError) throw videosError;
        
        if (videosData) {
          let userEnrollments: string[] = [];
          let userBookmarks: string[] = [];
          
          if (user) {
            const { data: enrollments } = await supabase
              .from('enrollments')
              .select('video_id')
              .eq('user_id', user.id);
              
            const { data: bookmarks } = await supabase
              .from('bookmarks')
              .select('video_id')
              .eq('user_id', user.id);
              
            userEnrollments = enrollments?.map(e => e.video_id) || [];
            userBookmarks = bookmarks?.map(b => b.video_id) || [];
          }
          
          const videosWithTutor = videosData.map((video: any) => {
            const ratings = video.video_ratings || [];
            const ratingSum = ratings.reduce((sum: number, r: any) => sum + r.rating, 0);
            const ratingAvg = ratings.length > 0 ? ratingSum / ratings.length : 0;
            
            return {
              ...video,
              tutor_name: video.profiles?.name || 'Unknown Tutor',
              tutor_avatar_url: video.profiles?.avatar_url || null,
              rating_average: ratingAvg,
              rating_count: ratings.length,
              students_count: video.enrollments?.length || 0,
              is_enrolled: userEnrollments.includes(video.id),
              is_bookmarked: userBookmarks.includes(video.id)
            };
          });
          
          setVideos(videosWithTutor);
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

  const handleEnroll = async (videoId: string) => {
    if (!user) {
      alert('Please sign in to enroll in this course');
      return;
    }

    const video = videos.find(v => v.id === videoId);
    if (!video) return;

    if (video.is_enrolled) {
      alert('You are already enrolled in this course');
      return;
    }
    
    try {
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingEnrollment) {
        setVideos(videos.map(v => 
          v.id === videoId ? { ...v, is_enrolled: true } : v
        ));
        return;
      }

      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          video_id: videoId,
          progress: 0,
          completed: false
        });
      
      if (enrollError) throw enrollError;
      
      setVideos(videos.map(v => 
        v.id === videoId 
          ? { ...v, is_enrolled: true, students_count: v.students_count + 1 }
          : v
      ));
      
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      if (error.code === '23505') {
        setVideos(videos.map(v => 
          v.id === videoId ? { ...v, is_enrolled: true } : v
        ));
      } else {
        alert('Failed to enroll: ' + error.message);
      }
    }
  };

  const handleBookmark = async (videoId: string) => {
    if (!user) {
      alert('Please sign in to bookmark this course');
      return;
    }
    
    const video = videos.find(v => v.id === videoId);
    if (!video?.is_enrolled) {
      alert('Please enroll in the course to bookmark it');
      return;
    }
    
    try {
      if (video.is_bookmarked) {
        const { error: deleteError } = await supabase
          .from('bookmarks')
          .delete()
          .eq('user_id', user.id)
          .eq('video_id', videoId);
        
        if (deleteError) throw deleteError;
        
        setVideos(videos.map(v => 
          v.id === videoId ? { ...v, is_bookmarked: false } : v
        ));
        
      } else {
        const { error: bookmarkError } = await supabase
          .from('bookmarks')
          .insert({
            user_id: user.id,
            video_id: videoId
          });
        
        if (bookmarkError) throw bookmarkError;
        
        setVideos(videos.map(v => 
          v.id === videoId ? { ...v, is_bookmarked: true } : v
        ));
      }
      
    } catch (error: any) {
      console.error('Error managing bookmark:', error);
      alert('Failed to manage bookmark: ' + error.message);
    }
  };

  const handleVideoClick = async (video: VideoWithTutor) => {
    if (!video.is_enrolled) {
      await handleEnroll(video.id);
    }

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
  if (signedUrlError.message.includes('not found')) {

          setVideos(videos => videos.filter(v => v.id !== video.id));
          throw new Error('This video is no longer available. It may have been removed by the tutor.');
  }
  throw new Error(signedUrlError.message);

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
          watch_time: Math.floor(currentTime)
        })
        .eq('user_id', user?.id)
        .eq('video_id', videoId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating watch time:', error);
    }
  };

  // Filter videos based on search term, category, and level
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = 
      video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'All Categories' || video.category === selectedCategory;
    const matchesLevel = selectedLevel === 'All Levels' || video.difficulty_level === selectedLevel;
    
    return matchesSearch && matchesCategory && matchesLevel;
  });

  // Sort videos based on selected sort option
  const sortedVideos = [...filteredVideos].sort((a, b) => {
    if (sortBy === 'popularity') {
      return b.students_count - a.students_count;
    } else if (sortBy === 'rating') {
      return b.rating_average - a.rating_average;
    } else {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header and search section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-4 md:mb-0">Explore Courses</h1>
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search courses..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Filters section */}
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Level
            </label>
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
            >
              {LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="popularity">Most Popular</option>
              <option value="rating">Highest Rated</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {sortedVideos.length} courses found
        </h2>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading courses...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <p className="text-red-500">{error}</p>
        </div>
      ) : sortedVideos.length === 0 ? (
        <div className="text-center py-12">
          <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No courses found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {videos.length === 0 
              ? "No courses have been uploaded yet. Check back later!"
              : "Try adjusting your search or filter criteria."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {sortedVideos.map((video) => (
            <div key={video.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="relative">
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
                  <span className="text-gray-500">
                    ({video.rating_count} {video.rating_count === 1 ? 'rating' : 'ratings'})
                  </span>
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
                  <span className="text-sm text-gray-500">
                    {video.students_count} {video.students_count === 1 ? 'student' : 'students'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {video.is_enrolled ? (
                    <button
                      onClick={() => handleVideoClick(video)}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200 text-center"
                    >
                      Watch Video
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleEnroll(video.id)}
                      className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors duration-200"
                    >
                      Enroll
                    </button>
                  )}
                  <button
                    onClick={() => handleBookmark(video.id)}
                    disabled={!video.is_enrolled}
                    className={`w-full border py-2 px-4 rounded-md transition-colors duration-200 ${
                      video.is_enrolled
                        ? video.is_bookmarked
                          ? 'bg-yellow-50 text-yellow-600 border-yellow-600 hover:bg-yellow-100'
                          : 'bg-white text-indigo-600 border-indigo-600 hover:bg-indigo-50'
                        : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
                    }`}
                  >
                    {video.is_bookmarked ? 'Bookmarked' : 'Bookmark'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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
