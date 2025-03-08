import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { Upload, Image, X, AlertCircle, CheckCircle } from 'lucide-react';

const CATEGORIES = [
  'Web Development',
  'Data Science',
  'Mobile Development',
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Other',
] as const; // Make it a const tuple for better typing

const DIFFICULTY_LEVELS = ['Beginner', 'Intermediate', 'Advanced'] as const; // Make it a const tuple

// Define types for category and difficulty level
type Category = typeof CATEGORIES[number];
type DifficultyLevel = typeof DIFFICULTY_LEVELS[number];

export const VideoUpload = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [category, setCategory] = useState<Category | ''>('');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel | ''>('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

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
                <p>Only tutors can upload videos. Please sign in as a tutor to access this feature.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('video/')) {
        setError('Please select a valid video file (e.g., MP4, WebM)');
        return;
      }
      setVideoFile(file);
      setError(null);
    }
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file (e.g., PNG, JPG, GIF)');
        return;
      }
      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
      setThumbnailPreview(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!videoFile) {
      setError('Please select a video file to upload');
      return;
    }
    
    if (!title.trim()) {
      setError('Please enter a title for your video');
      return;
    }
    
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);
      
      const videoFileName = `${Date.now()}_${videoFile.name.replace(/\s+/g, '_')}`;
      const videoFilePath = `${user.id}/${videoFileName}`;
      
      const { error: videoUploadError } = await supabase.storage
        .from('videos')
        .upload(videoFilePath, videoFile, {
          cacheControl: '3600',
          upsert: false,
          // Note: Supabase JS client does not currently support onUploadProgress
          // This is a limitation of the library; progress tracking would require a custom solution
        });
      
      if (videoUploadError) throw videoUploadError;
      
      const { data: videoUrlData } = supabase.storage
        .from('videos')
        .getPublicUrl(videoFilePath);
      
      if (!videoUrlData?.publicUrl) throw new Error('Failed to get video URL');
      
      let thumbnailUrl: string | null = null;
      
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
        
        const { data: thumbnailUrlData } = supabase.storage
          .from('videos')
          .getPublicUrl(thumbnailFilePath);
        
        if (thumbnailUrlData?.publicUrl) {
          thumbnailUrl = thumbnailUrlData.publicUrl;
        } else {
          throw new Error('Failed to get thumbnail URL');
        }
      }
      
      const videoData = {
        title: title.trim(),
        description: description.trim(),
        url: videoUrlData.publicUrl,
        thumbnail_url: thumbnailUrl,
        category: category || null,
        difficulty_level: difficultyLevel || null,
        tutor_id: user.id,
      };
      
      const { error: dbError } = await supabase
        .from('videos')
        .insert(videoData);
      
      if (dbError) throw dbError;
      
      setSuccess(true);
      
      setTimeout(() => {
        navigate('/tutor/videos');
      }, 2000);
      
    } catch (error: any) {
      console.error('Error uploading video:', error);
      setError(error.message || 'Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0); // Reset progress after upload
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-5 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload New Video</h1>
          <p className="mt-1 text-sm text-gray-500">
            Share your knowledge with students by uploading educational videos.
          </p>
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
      
      {success && (
        <div className="mb-6 bg-green-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success!</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your video has been uploaded successfully. Redirecting to your videos...</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
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
              disabled={uploading}
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
              disabled={uploading}
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
                onChange={(e) => setCategory(e.target.value as Category)}
                disabled={uploading}
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
                onChange={(e) => setDifficultyLevel(e.target.value as DifficultyLevel)}
                disabled={uploading}
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
          <label className="block text-sm font-medium text-gray-700">Video File *</label>
          <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
            <div className="space-y-1 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="flex text-sm text-gray-600">
                <label
                  htmlFor="video-upload"
                  className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-indigo-500 focus-within:ring-offset-2"
                >
                  <span>Upload a video</span>
                  <input
                    id="video-upload"
                    name="video-upload"
                    type="file"
                    accept="video/*"
                    className="sr-only"
                    onChange={handleVideoChange}
                    disabled={uploading}
                  />
                </label>
                <p className="pl-1">or drag and drop</p>
              </div>
              <p className="text-xs text-gray-500">MP4, WebM, or other video formats</p>
              {videoFile && (
                <p className="text-sm text-indigo-600 mt-2">
                  Selected: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Thumbnail Image</label>
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
                  disabled={uploading}
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
                      disabled={uploading}
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 5MB</p>
              </div>
            )}
          </div>
        </div>
        
        {uploading && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Upload Progress: {uploadProgress}%
            </label>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
              <div
                className="bg-indigo-600 h-2.5 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/tutor/videos')}
            disabled={uploading}
            className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 mr-3"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || success}
            className={`inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
              uploading || success
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </div>
      </form>
    </div>
  );
};