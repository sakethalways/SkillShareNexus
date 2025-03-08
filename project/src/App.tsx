import  { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthForm } from './components/auth/AuthForm';
import LearnerDashboard from './components/dashboard/LearnerDashboard';
import { TutorDashboard } from './components/dashboard/TutorDashboard';
import { HomePage } from './components/home/HomePage';
import { AboutUs } from './components/home/AboutUs';
import { CourseList } from './components/courses/CourseList';
import { ProfileEdit } from './components/profile/ProfileEdit';
import { Navbar } from './components/layout/Navbar';
import { VideoUpload } from './components/videos/VideoUpload';
import { VideoList } from './components/videos/VideoList';
import { VideoEdit } from './components/videos/VideoEdit';
import { ConnectPage } from './components/connect/ConnectPage';
import { useAuthStore } from './store/authStore';

function App() {
  const { user, loading, initialize } = useAuthStore();

  useEffect(() => {
    const cleanup = initialize();
    return () => {
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [initialize]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <Router>
      {user && <Navbar />}
      <Routes>
        <Route path="/" element={user ? <HomePage /> : <AuthForm />} />
        <Route path="/about" element={<AboutUs />} />
        <Route
          path="/courses"
          element={
            user?.role === 'learner' ? (
              <CourseList />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/connect"
          element={
            user?.role === 'learner' ? (
              <ConnectPage />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={user ? <ProfileEdit /> : <Navigate to="/" replace />}
        />
        <Route
          path="/learner/dashboard"
          element={
            user?.role === 'learner' ? (
              <LearnerDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/tutor/dashboard"
          element={
            user?.role === 'tutor' ? (
              <TutorDashboard />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/tutor/upload-video"
          element={
            user?.role === 'tutor' ? (
              <VideoUpload />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/tutor/videos"
          element={
            user?.role === 'tutor' ? (
              <VideoList />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/tutor/videos/edit/:id"
          element={
            user?.role === 'tutor' ? (
              <VideoEdit />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;