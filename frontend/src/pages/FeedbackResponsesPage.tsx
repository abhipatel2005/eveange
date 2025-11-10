import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Download,
  Star,
  TrendingUp,
  Users,
  MessageSquare,
  BarChart3,
} from "lucide-react";
import { BackButton } from "../components/common/BackButton";
import { useEventStore } from "../store/eventStore";
import { RegistrationService, Registration } from "../api/registrations";
import { Loader } from "../components/common/Loader";

interface FeedbackStats {
  totalResponses: number;
  averageRating: number;
  npsScore: number;
  recommendationRate: number;
}

interface RatingDistribution {
  rating: string;
  count: number;
  percentage: number;
}

export default function FeedbackResponsesPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { events, selectedEvent, loadEvent } = useEventStore();
  const event = events.find((e) => e.id === eventId) || selectedEvent;

  const [responses, setResponses] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<FeedbackStats>({
    totalResponses: 0,
    averageRating: 0,
    npsScore: 0,
    recommendationRate: 0,
  });
  const [ratingDistribution, setRatingDistribution] = useState<
    RatingDistribution[]
  >([]);

  useEffect(() => {
    if (eventId) {
      loadEvent(eventId);
      fetchFeedbackResponses();
    }
  }, [eventId]);

  const fetchFeedbackResponses = async () => {
    if (!eventId) return;

    try {
      setLoading(true);
      const result = await RegistrationService.getEventRegistrations(eventId);

      if (result.success && result.data) {
        setResponses(result.data.registrations);
        calculateStats(result.data.registrations);
      }
    } catch (error) {
      console.error("Failed to fetch feedback responses:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: Registration[]) => {
    if (data.length === 0) return;

    // Calculate average rating
    const ratings: number[] = [];
    const npsScores: number[] = [];
    const recommendations: string[] = [];
    const distribution: { [key: string]: number } = {};

    data.forEach((response) => {
      const formData = response.responses || {};

      // Extract ratings (looking for fields with "rating" in the ID)
      Object.entries(formData).forEach(([key, value]) => {
        if (
          key.includes("rating") &&
          typeof value === "string" &&
          !isNaN(Number(value))
        ) {
          const rating = Number(value);
          ratings.push(rating);

          // Build distribution
          const ratingKey = `${rating} Star${rating !== 1 ? "s" : ""}`;
          distribution[ratingKey] = (distribution[ratingKey] || 0) + 1;
        }

        // Extract NPS scores
        if (key.includes("nps") && !isNaN(Number(value))) {
          npsScores.push(Number(value));
        }

        // Extract recommendations
        if (key.includes("recommend")) {
          recommendations.push(String(value).toLowerCase());
        }
      });
    });

    // Calculate average rating
    const avgRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
        : 0;

    // Calculate NPS (promoters - detractors) / total * 100
    const promoters = npsScores.filter((s) => s >= 9).length;
    const detractors = npsScores.filter((s) => s <= 6).length;
    const nps =
      npsScores.length > 0
        ? ((promoters - detractors) / npsScores.length) * 100
        : 0;

    // Calculate recommendation rate
    const yesRecommendations = recommendations.filter((r) =>
      r.includes("yes")
    ).length;
    const recRate =
      recommendations.length > 0
        ? (yesRecommendations / recommendations.length) * 100
        : 0;

    // Build rating distribution array
    const distArray = Object.entries(distribution)
      .map(([rating, count]) => ({
        rating,
        count,
        percentage: (count / ratings.length) * 100,
      }))
      .sort((a, b) => b.rating.localeCompare(a.rating));

    setStats({
      totalResponses: data.length,
      averageRating: avgRating,
      npsScore: nps,
      recommendationRate: recRate,
    });

    setRatingDistribution(distArray);
  };

  const exportToCSV = () => {
    if (responses.length === 0) return;

    // Get all unique field keys
    const allKeys = new Set<string>();
    responses.forEach((response) => {
      Object.keys(response.responses || {}).forEach((key) => allKeys.add(key));
    });

    // Build CSV
    const headers = ["Submitted At", "User Email", ...Array.from(allKeys)];
    const rows = responses.map((response) => {
      const formData = response.responses || {};
      return [
        new Date(response.created_at).toLocaleString(),
        response.email || "N/A",
        ...Array.from(allKeys).map((key) => formData[key] || ""),
      ];
    });

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    // Download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event?.title || "event"}-feedback-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" text="Loading feedback responses..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <BackButton
                onClick={() => navigate(`/events/${eventId}`)}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                label=""
              />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Feedback Responses
                </h1>
                <p className="text-sm text-gray-600">{event?.title}</p>
              </div>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Responses
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalResponses}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Average Rating
                </p>
                <div className="flex items-center mt-2">
                  <p className="text-3xl font-bold text-gray-900">
                    {stats.averageRating.toFixed(1)}
                  </p>
                  <Star className="w-5 h-5 text-yellow-400 ml-2 fill-current" />
                </div>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Star className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">NPS Score</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.npsScore.toFixed(0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.npsScore >= 50
                    ? "Excellent"
                    : stats.npsScore >= 0
                    ? "Good"
                    : "Needs Improvement"}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Would Recommend
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.recommendationRate.toFixed(0)}%
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <MessageSquare className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Rating Distribution */}
        {ratingDistribution.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Rating Distribution
            </h2>
            <div className="space-y-3">
              {ratingDistribution.map((dist) => (
                <div key={dist.rating}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">
                      {dist.rating}
                    </span>
                    <span className="text-gray-600">
                      {dist.count} ({dist.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary-600 h-2 rounded-full"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Individual Responses */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-6 border-b">
            <h2 className="text-lg font-semibold text-gray-900">
              All Responses
            </h2>
          </div>
          <div className="divide-y">
            {responses.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No feedback responses yet</p>
              </div>
            ) : (
              responses.map((response) => (
                <div key={response.id} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {response.email || response.name || "Anonymous"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(response.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {Object.entries(response.responses || {}).map(
                      ([key, value]) => (
                        <div key={key} className="bg-gray-50 p-3 rounded-lg">
                          <p className="text-sm font-medium text-gray-700 mb-1">
                            {key
                              .split("-")
                              .map(
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
                              )
                              .join(" ")}
                          </p>
                          <p className="text-gray-900">
                            {typeof value === "string" &&
                            !isNaN(Number(value)) &&
                            Number(value) <= 5
                              ? "⭐".repeat(Number(value))
                              : String(value)}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
