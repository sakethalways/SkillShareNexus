"use client"

import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { useAuthStore } from "../../store/authStore"
import { supabase } from "../../lib/supabase"
import {
  Video,
  BookOpen,
  Award,
  Users,
  Eye,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  Clock,
  Mail,
  Briefcase,
  GraduationCap,
  Edit,
  Star,
} from "lucide-react"

interface VideoStats {
  id: string
  title: string
  views: number
  students: number
  likes: number
  comments: number
  rating_average: number
  rating_count: number
  watch_time: number
  engagement_rate: number
}

interface Comment {
  id: string
  content: string
  created_at: string
  video_title: string
  user_name: string
  user_avatar_url: string | null
}



export const TutorDashboard = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    totalStudents: 0,
    totalLikes: 0,
    totalComments: 0,
    averageRating: 0,
  })
  const [videoStats, setVideoStats] = useState<VideoStats[]>([])
  const [recentComments, setRecentComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [analyticsRange, setAnalyticsRange] = useState<"week" | "month" | "year">("week")
  const [analyticsData, setAnalyticsData] = useState({
    total_watch_time: 0,
    avg_completion_rate: 0,
    engagement_rate: 0,
    trending_videos: [] as VideoStats[],
  })

  useEffect(() => {
    if (!user || user.role !== "tutor") return

    // Update the fetchStats function to use proper type assertions
    const fetchStats = async () => {
      try {
        setLoading(true)
        setError(null)

        const { data: videosData, error: videosError } = await supabase
          .from("videos")
          .select(`
            *,
            enrollments (
              watch_time,
              completed
            ),
            video_ratings (
              rating
            ),
            likes (count),
            comments (count)
          `)
          .eq("tutor_id", user.id)

        if (videosError) throw videosError

        if (videosData) {
          const videoStatsData: VideoStats[] = (videosData || []).map((video: any) => {
            const enrollments = video.enrollments || []
            const ratings = video.video_ratings || []
            const totalWatchTime = enrollments.reduce((sum: number, e: any) => sum + (e.watch_time || 0), 0)
            const ratingSum = ratings.reduce((sum: number, r: any) => sum + r.rating, 0)
            const ratingAvg = ratings.length > 0 ? ratingSum / ratings.length : 0
            const likesCount = video.likes?.length || 0
            const commentsCount = video.comments?.length || 0
            const viewsCount = enrollments.length * 3

            return {
              id: video.id,
              title: video.title,
              views: viewsCount,
              students: enrollments.length,
              likes: likesCount,
              comments: commentsCount,
              rating_average: ratingAvg,
              rating_count: ratings.length,
              watch_time: totalWatchTime,
              engagement_rate: viewsCount > 0 ? ((likesCount + commentsCount) / viewsCount) * 100 : 0,
            }
          })

          const now = new Date()
          const rangeStart = new Date()
          switch (analyticsRange) {
            case "week":
              rangeStart.setDate(now.getDate() - 7)
              break
            case "month":
              rangeStart.setMonth(now.getMonth() - 1)
              break
            case "year":
              rangeStart.setFullYear(now.getFullYear() - 1)
              break
          }

          const trendingVideos = [...videoStatsData].sort((a, b) => b.engagement_rate - a.engagement_rate).slice(0, 5)

          setVideoStats(videoStatsData)
          setAnalyticsData({
            total_watch_time: videoStatsData.reduce((sum, video) => sum + video.watch_time, 0),
            avg_completion_rate:
              (videoStatsData.reduce(
                (sum, video) => sum + (video.students > 0 ? video.watch_time / (video.students * 3600) : 0),
                0,
              ) /
                videoStatsData.length) *
              100,
            engagement_rate:
              videoStatsData.reduce((sum, video) => sum + video.engagement_rate, 0) / videoStatsData.length,
            trending_videos: trendingVideos,
          })

          const totalStats = {
            totalVideos: videosData.length,
            totalViews: videoStatsData.reduce((sum, video) => sum + video.views, 0),
            totalStudents: videoStatsData.reduce((sum, video) => sum + video.students, 0),
            totalLikes: videoStatsData.reduce((sum, video) => sum + video.likes, 0),
            totalComments: videoStatsData.reduce((sum, video) => sum + video.comments, 0),
            averageRating:
              videoStatsData.reduce((sum, video) => sum + video.rating_average * video.rating_count, 0) /
                videoStatsData.reduce((sum, video) => sum + video.rating_count, 0) || 0,
          }

          setStats(totalStats)

          const { data: commentsData, error: commentsError } = await supabase
            .from("comments")
            .select(`
              id,
              content,
              created_at,
              video_id,
              videos!left (
                id,
                title,
                tutor_id
              ),
              profiles!left (
                id,
                name,
                avatar_url
              )
            `)
            .in(
              "video_id",
              videosData.map((v: any) => v.id),
            )
            .order("created_at", { ascending: false })
            .limit(5)

          if (commentsError) throw commentsError

          const transformedComments = (commentsData || []).map((comment: any) => {
            return {
              id: comment.id,
              content: comment.content,
              created_at: comment.created_at,
              video_title: comment.videos ? comment.videos.title : "Unknown Video",
              user_name: comment.profiles ? comment.profiles.name : "Anonymous User",
              user_avatar_url: comment.profiles ? comment.profiles.avatar_url : null,
            }
          })

          setRecentComments(transformedComments)
        }
      } catch (error: any) {
        console.error("Error fetching tutor stats:", error)
        setError(error.message || "Failed to load statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [user, analyticsRange])

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  if (!user || user.role !== "tutor") {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4">
        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <Award className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Access Denied</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Only tutors can access this dashboard. Please sign in as a tutor to view your statistics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.name}!</h1>
              <p className="mt-1 text-sm text-gray-900">Here's what's happening with your courses today</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link
                to="/tutor/upload-video"
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Video className="h-5 w-5 mr-2" />
                Upload New Video
              </Link>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
              <div className="flex-shrink-0">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url || "/placeholder.svg"}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                    <GraduationCap className="h-12 w-12 text-gray-600" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                    <Award className="h-3 w-3 mr-1" />
                    Verified Tutor
                  </span>
                  <Link
                    to="/profile"
                    className="text-indigo-600 hover:text-indigo-900 flex items-center text-sm font-medium"
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit Profile
                  </Link>
                </div>

                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center text-gray-700">
                    <Mail className="h-4 w-4 mr-2 text-indigo-600" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  {user.subject && (
                    <div className="flex items-center text-gray-700">
                      <Briefcase className="h-4 w-4 mr-2 text-indigo-600" />
                      <span className="text-sm">{user.subject}</span>
                    </div>
                  )}
                </div>

                {user.bio && <p className="mt-2 text-sm text-gray-600">{user.bio}</p>}

                {user.skills && user.skills.length > 0 && (
                  <div className="mt-3">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {user.skills.map((skill, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col space-y-2 text-center md:text-right">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalStudents}</p>
                  <p className="text-sm text-gray-500">Total Students</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
                  <p className="text-sm text-gray-500">Videos Published</p>
                </div>
                {stats.averageRating > 0 && (
                  <div className="flex items-center justify-center md:justify-end text-gray-900">
                    <Star className="h-5 w-5 text-yellow-500 fill-current" />
                    <span className="ml-1 text-lg font-semibold">{stats.averageRating.toFixed(1)}</span>
                    <span className="ml-1 text-sm text-gray-500">
                      ({videoStats.reduce((sum, video) => sum + video.rating_count, 0)} ratings)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Analytics Overview</h2>
            <div className="flex space-x-2">
              {(["week", "month", "year"] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setAnalyticsRange(range)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    analyticsRange === range ? "bg-indigo-600 text-white" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {range.charAt(0).toUpperCase() + range.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <Clock className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Total Watch Time</h3>
                <p className="text-2xl font-semibold">{formatDuration(analyticsData.total_watch_time)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Avg. Completion</h3>
                <p className="text-2xl font-semibold">{analyticsData.avg_completion_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Engagement Rate</h3>
                <p className="text-2xl font-semibold">{analyticsData.engagement_rate.toFixed(1)}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-amber-100 text-amber-600">
                <Eye className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-900">Total Views</h3>
                <p className="text-2xl font-semibold">{videoStats.reduce((sum, video) => sum + video.views, 0)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-medium text-gray-900">Trending Videos</h2>
            <Link to="/tutor/videos" className="text-sm text-indigo-600 hover:text-indigo-900">
              View All Videos
            </Link>
          </div>

          <div className="space-y-4">
            {analyticsData.trending_videos.map((video) => (
              <div key={video.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{video.title}</h3>
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span className="flex items-center text-amber-600">
                      <Eye className="h-4 w-4 mr-1" />
                      {video.views} views
                    </span>
                    <span className="flex items-center text-rose-600">
                      <ThumbsUp className="h-4 w-4 mr-1" />
                      {video.likes} likes
                    </span>
                    <span className="flex items-center text-blue-600">
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {video.comments} comments
                    </span>
                  </div>
                </div>
                <div className="ml-4">
                  <Link
                    to={`/tutor/videos/edit/${video.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-indigo-600 text-sm font-medium rounded-md text-indigo-600 bg-white hover:bg-indigo-50"
                  >
                    View Details
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-full bg-emerald-100 text-emerald-600">
                <BookOpen className="h-6 w-6" />
              </div>
              <h3 className="ml-2 text-lg font-semibold">Course Management</h3>
            </div>
            {stats.totalVideos > 0 ? (
              <div>
                <p className="text-gray-600 mb-4">You have uploaded {stats.totalVideos} videos.</p>
                <Link
                  to="/tutor/videos"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Manage Videos
                </Link>
              </div>
            ) : (
              <div>
                <p className="text-gray-600 mb-4">You haven't uploaded any videos yet.</p>
                <Link
                  to="/tutor/upload-video"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Video className="h-5 w-5 mr-2" />
                  Upload First Video
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="p-2 rounded-full bg-blue-100 text-blue-600">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="ml-2 text-lg font-semibold">Recent Comments</h3>
            </div>

            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
                <div className="h-16 bg-gray-200 rounded"></div>
              </div>
            ) : error ? (
              <p className="text-sm text-red-500">{error}</p>
            ) : recentComments.length > 0 ? (
              <div className="space-y-4">
                {recentComments.map((comment) => (
                  <div key={comment.id} className="border rounded-lg p-4">
                    <div className="flex items-center">
                      {comment.user_avatar_url ? (
                        <img
                          src={comment.user_avatar_url || "/placeholder.svg"}
                          alt={comment.user_name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{comment.user_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()} at{" "}
                          {new Date(comment.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">{comment.content}</p>
                    <p className="mt-1 text-xs text-indigo-600">On: {comment.video_title}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <MessageSquare className="mx-auto h-10 w-10 text-blue-400" />
                <p className="mt-2 text-sm text-gray-500">No comments yet</p>
                <p className="text-xs text-gray-400 mt-1">Comments on your videos will appear here</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
