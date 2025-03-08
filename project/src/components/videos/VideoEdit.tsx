import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Video as VideoIcon, Image, X, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react';
import { Video } from '../../types/video';

// Categories for videos
const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Mobile Development',
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Other',
];

// Difficulty levels for videos
const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'];

export const VideoEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [video, setVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'tutor' || !id) return;
    
    const fetchVideo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .eq('id', id)
          .eq('tutor_id', user.id)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setVideo(data as Video);
          setTitle(data.title);
          setDescription(data.description || '');
          setCategory(data.category || '');
          setDifficultyLevel(data.difficulty_level || '');
          if (data.thumbnail_url) {
            setThumbnailPreview(data.thumbnail_url);
          }
        } else {
          throw new Error('Video not found');
        }
      } catch (error: any) {
        console.error('Error fetching video:', error);
        setError(error.message || 'Failed to load video');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVideo();
  }, [id, user]);

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is an image
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file for the thumbnail');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    if (thumbnailPreview && video?.thumbnail_url !== thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailPreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!video || !user) return;
    
    if (!title) {
      setError('Please enter a title for your video');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      
      let thumbnailUrl: string | undefined = video.thumbnail_url || undefined;
      
      // Upload new thumbnail if provided
      if (thumbnailFile) {
        const thumbnailFileName = `thumbnail_${Date.now()}_${thumbnailFile.name.replace(/\s+/g, '_')}`;
        const thumbnailFilePath = `${user.id}/${thumbnailFileName}`;
        
        const { error: thumbnailUploadError } = await supabase.storage
          .from('videos')
          .upload(thumbnailFilePath, thumbnailFile, {
            cacheControl: '3600',
            upsert: false,
          });
        
        if (thumbnailUploadError) throw thumbnailUploadError;
        
        // Get thumbnail URL
        const { data: thumbnailUrlData } = supabase.storage
          .from('videos')
          .getPublicUrl(thumbnailFilePath);
        
        if (thumbnailUrlData) {
          thumbnailUrl = thumbnailUrlData.publicUrl;
        }
      } else if (thumbnailPreview === null) {
        // If thumbnail was removed
        thumbnailUrl = undefined;
      }
      
      // Update video record in database
      const { error: dbError } = await supabase
        .from('videos')
        .update({
          title,
          description,
          thumbnail_url: thumbnailUrl,
          category,
          difficulty_level: difficultyLevel,
          updated_at: new Date().toISOString(),
        })
        .eq('id', video.id);
      
      if (dbError) throw dbError;
      
      setSuccess(true);
      
      // Redirect to videos page after 2 seconds
      setTimeout(() => {
        navigate('/tutor/videos');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error updating video:', error);
      setError(error.message || 'Failed to update video');
    } finally {
      setSaving(false);
    }
  };

  if (!user || user.role !== 'tutor') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Only tutors can edit videos. Please sign in as a tutor to access this feature.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading video details...</p>
      </div>
    );
  }

  if (error && !video) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => navigate('/tutor/videos')}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back to Videos
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Video</h1>
          <p className="mt-1 text-sm text-gray-500">
            Update your video details
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/tutor/videos')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Videos
        </button>
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
      
      {success && (
        <div className="mb-6 bg-green-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your video has been updated successfully. Redirecting to your videos...</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {video && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white shadow rounded-lg p-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
              Video Title *
            </label>
            <div className="mt-1">
              <input
                id="title"
                name="title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={saving}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Enter a descriptive title for your video"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <div className="mt-1">
              <textarea
                id="description"
                name="description"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={saving}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Provide a detailed description of your video content"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <div className="mt-1">
                <select
                  id="category"
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  disabled={saving}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select a category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="difficultyLevel" className="block text-sm font-medium text-gray-700">
                Difficulty Level
              </label>
              <div className="mt-1">
                <select
                  id="difficultyLevel"
                  name="difficultyLevel"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                  disabled={saving}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select difficulty level</option>
                  {DIFFICULTY_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {level}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium text-gray-700">Thumbnail Image</label>
              {video.url && (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  <VideoIcon className="h-4 w-4 inline mr-1" />
                  View Video
                </a>
              )}
            </div>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="max-h-48 rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 bg-red-100 rounded-full p-1 text-red-600 hover:bg-red-200"
                    disabled={saving}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Image className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="thumbnail-upload"
                      className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
                    >
                      <span>Upload a thumbnail</span>
                      <input
                        id="thumbnail-upload"
                        name="thumbnail-upload"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleThumbnailChange}
                        disabled={saving}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/tutor/videos')}
              disabled={saving}
              className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || success}
              className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                saving || success
                  ? 'bg-indigo-400 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
              }`}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
