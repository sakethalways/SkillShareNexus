import  { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Video as VideoIcon, Edit, Trash2, AlertCircle, Filter, Search, Clock } from 'lucide-react';
import { Video } from '../../types/video';

export const VideoList = () => {
  const { user } = useAuthStore();
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDifficulty, setSelectedDifficulty] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [difficultyLevels, setDifficultyLevels] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [stats, setStats] = useState<{[key: string]: {views: number, students: number}}>({});

  useEffect(() => {
    if (!user || user.role !== 'tutor') return;
    
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('tutor_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          setVideos(data as Video[]);
          
          // Extract unique categories and difficulty levels
          const uniqueCategories = Array.from(
            new Set(data.map((video: Video) => video.category).filter(Boolean))
          ) as string[];
          
          const uniqueDifficulties = Array.from(
            new Set(data.map((video: Video) => video.difficulty_level).filter(Boolean))
          ) as string[];
          
          setCategories(uniqueCategories);
          setDifficultyLevels(uniqueDifficulties);
          
          // Fetch stats for each video
          const videoStats: {[key: string]: {views: number, students: number}} = {};
          
          // For now, we'll use mock stats since we don't have real view tracking yet
          for (const video of data) {
            videoStats[video.id] = {
              views: Math.floor(Math.random() * 100), // Mock data
              students: Math.floor(Math.random() * 20)  // Mock data
            };
          }
          
          setStats(videoStats);
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

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      return;
    }
    
    try {
      setDeleting(videoId);
      
      // Get the video details first to get the file paths
      const {  error: fetchError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete the video record from the database
      const { error: deleteError } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);
      
      if (deleteError) throw deleteError;
      
      // Update the local state
      setVideos(videos.filter(video => video.id !== videoId));
      
      // Note: We're not deleting the actual files from storage here
      // as they might be referenced elsewhere. In a production app,
      // you might want to implement a cleanup process for unused files.
      
    } catch (error: any) {
      console.error('Error deleting video:', error);
      alert('Failed to delete video: ' + error.message);
    } finally {
      setDeleting(null);
    }
  };

  // Filter videos based on search term, category, and difficulty
const filteredVideos = videos.filter((video) => {
  const matchesSearch = 
    video.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (video.description && video.description.toLowerCase().includes(searchTerm.toLowerCase()));
  
  const matchesCategory = !selectedCategory || video.category === selectedCategory;
  const matchesDifficulty = !selectedDifficulty || video.difficulty_level === selectedDifficulty; // Fixed typo
  
  return matchesSearch && matchesCategory && matchesDifficulty;
});

  if (!user || user.role !== 'tutor') {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Only tutors can access this page. Please sign in as a tutor to view your videos.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Videos</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your uploaded educational videos
          </p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link
            to="/tutor/upload-video"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <VideoIcon className="h-5 w-5 mr-2" />
            Upload New Video
          </Link>
        </div>
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white shadow rounded-lg mb-8">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-medium text-gray-900">Search & Filter</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <Filter className="h-4 w-4 mr-1" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
        
        <div className={`p-4 ${showFilters ? 'block' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search by title or description"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty Level
              </label>
              <select
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
              >
                <option value="">All Levels</option>
                {difficultyLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Course Management</h3>
          <p className="text-3xl font-bold text-indigo-600">{videos.length}</p>
          <p className="text-sm text-gray-500">Total videos uploaded</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Total Views</h3>
          <p className="text-3xl font-bold text-indigo-600">
            {Object.values(stats).reduce((sum, stat) => sum + stat.views, 0)}
          </p>
          <p className="text-sm text-gray-500">Across all videos</p>
        </div>
        
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Total Students</h3>
          <p className="text-3xl font-bold text-indigo-600">
            {Object.values(stats).reduce((sum, stat) => sum + stat.students, 0)}
          </p>
          <p className="text-sm text-gray-500">Enrolled in your videos</p>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading your videos...</p>
        </div>
      ) : filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <VideoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No videos found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {videos.length === 0
              ? "You haven't uploaded any videos yet. Get started by uploading your first video."
              : "No videos match your search criteria. Try adjusting your filters."}
          </p>
          {videos.length === 0 && (
            <div className="mt-6">
              <Link
                to="/tutor/upload-video"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <VideoIcon className="h-5 w-5 mr-2" />
                Upload First Video
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredVideos.map((video) => (
            <div key={video.id} className="bg-white overflow-hidden shadow rounded-lg">
              <div className="relative h-48">
                {video.thumbnail_url ? (
                  <img
                    src={video.thumbnail_url}
                    alt={video.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <VideoIcon className="h-12 w-12 text-gray-400" />
                  </div>
                )}
                <div className="absolute top-2 right-2 flex space-x-2">
                  {video.category && (
                    <div className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {video.category}
                    </div>
                  )}
                  {video.difficulty_level && (
                    <div className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                      {video.difficulty_level}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                  {video.title}
                </h3>
                {video.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {video.description}
                  </p>
                )}
                <div className="mt-2 flex items-center text-xs text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Uploaded on {new Date(video.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Views</p>
                    <p className="text-sm font-semibold">{stats[video.id]?.views || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <p className="text-xs text-gray-500">Students</p>
                    <p className="text-sm font-semibold">{stats[video.id]?.students || 0}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex justify-between">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                  >
                    <VideoIcon className="h-4 w-4 mr-1" />
                    Watch
                  </a>
                  <div className="flex space-x-2">
                    <Link
                      to={`/tutor/videos/edit/${video.id}`}
                      className="inline-flex items-center p-1.5 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteVideo(video.id)}
                      disabled={deleting === video.id}
                      className={`inline-flex items-center p-1.5 border border-gray-300 rounded-md ${
                        deleting === video.id
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};