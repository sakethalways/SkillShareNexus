import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserRole } from '../../types/auth';
import { GraduationCap, ClipboardCheck as ChalkboardTeacher, AlertCircle, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { handleAuth } from '../../lib/supabase';

export const AuthForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('learner');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { error, setError, initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!email || !password || (isSignUp && !name)) {
      setError('Please fill in all required fields');
      return;
    }

    if (isSignUp && !acceptedTerms) {
      setError('Please accept the terms and conditions to create an account');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await handleAuth(email, password, isSignUp, role, name);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const TermsAndConditions = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-gray-900">Terms and Conditions</h3>
            <button
              onClick={() => setShowTerms(false)}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="prose prose-sm">
            <h4>1. Acceptance of Terms</h4>
            <p>
              By accessing and using Skill Share Nexus, you agree to be bound by these Terms and Conditions
              and all applicable laws and regulations.
            </p>

            <h4>2. User Accounts</h4>
            <p>
              You are responsible for maintaining the confidentiality of your account and password.
              You agree to accept responsibility for all activities that occur under your account.
            </p>

            <h4>3. Content Guidelines</h4>
            <p>
              Users agree to post only appropriate, educational content that does not violate any
              laws or infringe on any intellectual property rights.
            </p>

            <h4>4. Privacy Policy</h4>
            <p>
              Your use of Skill Share Nexus is also governed by our Privacy Policy, which outlines
              how we collect, use, and protect your personal information.
            </p>

            <h4>5. Educational Content</h4>
            <p>
              - Content is provided "as is" without warranties of any kind
              - We do not guarantee the accuracy of any educational materials
              - Users are responsible for verifying information before relying on it
            </p>

            <h4>6. User Conduct</h4>
            <p>
              Users agree to:
              - Respect other users and their content
              - Not engage in harassment or abusive behavior
              - Not upload malicious content or spam
              - Not attempt to manipulate the platform or its features
            </p>

            <h4>7. Intellectual Property</h4>
            <p>
              - Users retain ownership of their original content
              - By uploading content, users grant Skill Share Nexus a license to use and display it
              - Users must respect copyright and other intellectual property rights
            </p>

            <h4>8. Termination</h4>
            <p>
              We reserve the right to terminate or suspend accounts that violate these terms
              or engage in inappropriate behavior.
            </p>

            <h4>9. Changes to Terms</h4>
            <p>
              We may update these terms at any time. Continued use of the platform after changes
              constitutes acceptance of the new terms.
            </p>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex justify-end">
          <button
            onClick={() => setShowTerms(false)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="absolute top-0 right-0 mt-4 mr-4">
        <Link
          to="/about"
          className="text-indigo-600 hover:text-indigo-500 font-medium"
        >
          About Us
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Welcome to Skill Share Nexus
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {isSignUp ? 'Create your account' : 'Sign in to your account'}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-start">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={onSubmit}>
            {isSignUp && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Name
                </label>
                <div className="mt-1">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={isSignUp}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="Enter your name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your password"
                  minLength={6}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                I am a:
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('learner')}
                  className={`flex items-center justify-center p-4 border rounded-lg ${
                    role === 'learner'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  <GraduationCap className="w-6 h-6 mr-2" />
                  Learner
                </button>
                <button
                  type="button"
                  onClick={() => setRole('tutor')}
                  className={`flex items-center justify-center p-4 border rounded-lg ${
                    role === 'tutor'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-500 hover:bg-indigo-50'
                  }`}
                >
                  <ChalkboardTeacher className="w-6 h-6 mr-2" />
                  Tutor
                </button>
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="terms"
                    name="terms"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="terms" className="font-medium text-gray-700">
                    I accept the{' '}
                    <button
                      type="button"
                      onClick={() => setShowTerms(true)}
                      className="text-indigo-600 hover:text-indigo-500"
                    >
                      terms and conditions
                    </button>
                  </label>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting || (isSignUp && !acceptedTerms)}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  isSubmitting || (isSignUp && !acceptedTerms)
                    ? 'bg-indigo-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isSubmitting ? 'Processing...' : isSignUp ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
                setEmail('');
                setPassword('');
                setName('');
                setAcceptedTerms(false);
              }}
              className="w-full text-center text-sm text-indigo-600 hover:text-indigo-500"
              disabled={isSubmitting}
            >
              {isSignUp
                ? 'Already have an account? Sign in'
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>

      {showTerms && <TermsAndConditions />}
    </div>
  );
};