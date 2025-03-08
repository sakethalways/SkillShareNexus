import { BookOpen, Users, Star, Award } from 'lucide-react';

export const AboutUs = () => {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            About Skill Share Nexus
          </h2>
          <p className="mt-4 text-lg text-gray-500">
            Empowering learners and educators through accessible, high-quality online education
          </p>
        </div>

        <div className="mt-20">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                      <BookOpen className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Our Mission</h3>
                  <p className="mt-5 text-base text-gray-500">
                    To create a global learning community where knowledge is shared freely and expertise is accessible to everyone. We believe in the power of education to transform lives and create opportunities.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                      <Users className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Our Community</h3>
                  <p className="mt-5 text-base text-gray-500">
                    We foster a diverse and inclusive community of learners and educators. Our platform connects passionate tutors with eager students, creating meaningful learning experiences.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                      <Star className="h-6 w-6 text-white" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Our Values</h3>
                  <p className="mt-5 text-base text-gray-500">
                    Quality, accessibility, and innovation drive everything we do. We're committed to providing the best learning experience through cutting-edge technology and expert instruction.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 bg-gray-50 rounded-2xl px-6 py-12 md:px-12">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900">Why Choose Skill Share Nexus?</h3>
            <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Award className="h-8 w-8 text-indigo-500 mx-auto" />
                <h4 className="mt-4 text-lg font-medium text-gray-900">Expert Tutors</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Learn from experienced professionals who are passionate about sharing their knowledge
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <BookOpen className="h-8 w-8 text-indigo-500 mx-auto" />
                <h4 className="mt-4 text-lg font-medium text-gray-900">Quality Content</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Access high-quality educational videos and resources across various subjects
                </p>
              </div>
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <Users className="h-8 w-8 text-indigo-500 mx-auto" />
                <h4 className="mt-4 text-lg font-medium text-gray-900">Interactive Learning</h4>
                <p className="mt-2 text-sm text-gray-500">
                  Engage with tutors and fellow learners through comments and discussions
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold text-gray-900">Join Our Community</h3>
          <p className="mt-4 text-lg text-gray-500">
            Whether you're here to learn or teach, Skill Share Nexus is your platform for growth and success.
          </p>
          <div className="mt-8">
            <a
              href="/"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Get Started Today
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};