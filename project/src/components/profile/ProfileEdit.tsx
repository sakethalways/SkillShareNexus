import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabase';
import { User, Camera, Loader } from 'lucide-react';

// Common interests for learners
const COMMON_INTERESTS = [
  'Web Development',
  'Data Science',
  'Mobile Development',
  'Programming',
  'Design',
  'Business',
  'Marketing',
  'Machine Learning',
  'Artificial Intelligence',
  'Cloud Computing',
  'DevOps',
  'Cybersecurity'
];

export const ProfileEdit = () => {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [subject, setSubject] = useState(user?.subject || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [interests, setInterests] = useState<string[]>(user?.interests || []);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setBio(user.bio || '');
      setSubject(user.subject || '');
      setAvatarUrl(user.avatar_url || '');
      setInterests(user.interests || []);
    }
  }, [user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      setMessage({ text: '', type: '' });

      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      // Use user ID as the folder name to comply with RLS policy
      const fileName = `${Math.random().toString().substring(2, 10)}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      if (data) {
        setAvatarUrl(data.publicUrl);
      }
    } catch (error: any) {
      setMessage({ text: error.message, type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSaving(true);
      setMessage({ text: '', type: '' });

      // First check if the profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let updateError;

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('profiles')
          .update({
            name,
            bio,
            avatar_url: avatarUrl,
            subject: user.role === 'tutor' ? subject : null,
            interests: user.role === 'learner' ? interests : null,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);
        
        updateError = error;
      } else {
        // Insert new profile
        const { error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            role: user.role,
            name,
            bio,
            avatar_url: avatarUrl,
            subject: user.role === 'tutor' ? subject : null,
            interests: user.role === 'learner' ? interests : null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        updateError = error;
      }

      if (updateError) throw updateError;

      // Update local user state
      setUser({
        ...user,
        name,
        bio,
        avatar_url: avatarUrl,
        subject: user.role === 'tutor' ? subject : undefined,
        interests: user.role === 'learner' ? interests : undefined,
      });

      setMessage({ text: 'Profile updated successfully!', type: 'success' });
      setSaving(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-between md:space-x-5">
        <div className="flex items-center space-x-5">
          <div className="flex-shrink-0">
            <div className="relative">
              {avatarUrl ? (
                <img
                  className="h-24 w-24 rounded-full object-cover"
                  src={avatarUrl}
                  alt={name}
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
              <label
                htmlFor="avatar-upload"
                className="absolute bottom-0 right-0 bg-white rounded-full p-1 border border-gray-300 cursor-pointer shadow-sm"
              >
                <Camera className="h-5 w-5 text-gray-500" />
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className=" sr-only"
                  disabled={uploading}
                />
              </label>
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
                  <Loader className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{user.name || 'Your Profile'}</h1>
            <p className="text-sm font-medium text-gray-500">
              {user.role === 'learner' ? 'Learner' : 'Tutor'} · Joined{' '}
              {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {message.text && (
        <div
          className={`mt-6 p-4 rounded-md ${
            message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <div className="mt-1">
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              required
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <div className="mt-1">
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              disabled
              className="shadow-sm bg-gray-50 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md cursor-not-allowed"
            />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Email cannot be changed. Contact support if you need to update your email.
          </p>
        </div>

        {user.role === 'tutor' && (
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
              Subject
            </label>
            <div className="mt-1">
              <input
                id="subject"
                name="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="e.g., Mathematics, Computer Science, Physics"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter your main teaching subject or area of expertise
            </p>
          </div>
        )}

        {user.role === 'learner' && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Interests
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Select your interests to get personalized video recommendations
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COMMON_INTERESTS.map((interest) => (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleInterest(interest)}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                    interests.includes(interest)
                      ? 'bg-indigo-100 text-indigo-800 border-2 border-indigo-300'
                      : 'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
            Bio
          </label>
          <div className="mt-1">
            <textarea
              id="bio"
              name="bio"
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
            />
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Brief description for your profile. URLs are hyperlinked.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              saving
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
            }`}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};