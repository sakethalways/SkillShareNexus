import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Search, LogOut, User, BookOpen, Video, Users } from 'lucide-react';

export const Navbar = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && user?.role === 'learner') {
      navigate(`/courses?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(e);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center">
                <BookOpen className="h-8 w-8 text-indigo-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">Skill Share Nexus</span>
              </Link>
            </div>
            {user && (
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  to={`/${user.role}/dashboard`}
                  className={`${
                    location.pathname === `/${user.role}/dashboard`
                      ? 'border-indigo-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                >
                  Dashboard
                </Link>
                {user.role === 'learner' && (
                  <>
                    <Link
                      to="/courses"
                      className={`${
                        location.pathname === '/courses'
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      Courses
                    </Link>
                    <Link
                      to="/connect"
                      className={`${
                        location.pathname === '/connect'
                          ? 'border-indigo-500 text-gray-900'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                      } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Connect
                    </Link>
                  </>
                )}
                {user.role === 'tutor' && (
                  <Link
                    to="/tutor/videos"
                    className={`${
                      location.pathname === '/tutor/videos'
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}
                  >
                    <Video className="h-4 w-4 mr-1" />
                    My Videos
                  </Link>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center">
            {user ? (
              <>
                {user.role === 'learner' && (
                  <div className="flex-shrink-0 relative">
                    <div className="hidden md:block mr-4">
                      <form onSubmit={handleSearch} className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search courses..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          onKeyPress={handleKeyPress}
                          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </form>
                    </div>
                  </div>
                )}
                <div className="ml-3 relative flex items-center space-x-4">
                  <Link
                    to="/profile"
                    className={`${
                      location.pathname === '/profile'
                        ? 'text-indigo-600'
                        : 'text-gray-500 hover:text-gray-700'
                    } p-1 rounded-full flex items-center`}
                  >
                    <User className="h-6 w-6" />
                    <span className="ml-1 text-sm hidden md:inline">Profile</span>
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="text-gray-500 hover:text-gray-700 p-1 rounded-full flex items-center"
                  >
                    <LogOut className="h-6 w-6" />
                    <span className="ml-1 text-sm hidden md:inline">Sign out</span>
                  </button>
                </div>
              </>
            ) : (
              <div>
                <Link
                  to="/"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign in
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};