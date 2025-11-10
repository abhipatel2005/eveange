import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService } from "../api/events";
import { StaffService, StaffEvent } from "../api/staff";
import { RegistrationService } from "../api/registrations";
import { truncateText, isTruncated } from "../utils/textUtils";
import { MapPin, Calendar } from "lucide-react";
import { useCachedApi } from "../hooks/useCachedApi";

const DashboardPage: React.FC = () => {
  const { accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  // Use cached API for dashboard data - prevents re-fetching on tab switches
  const { data: dashboardData, loading } = useCachedApi(
    `dashboard-${accessToken?.slice(-10)}`, // Unique cache key per user
    async () => {
      if (!isAuthenticated || !accessToken) {
        clearAuth();
        navigate("/login");
        throw new Error("Not authenticated");
      }

      // Fetch all data in parallel
      const [myEventsRes, regRes] = await Promise.all([
        EventService.getMyEvents({ limit: 5 }),
        RegistrationService.getUserRegistrations({ limit: 5 }),
      ]);

      const orgEventsArr = myEventsRes.data?.events || [];
      const regList = regRes.data?.registrations || [];

      // Try to fetch staff events (might fail if no permissions)
      let eventsArr: StaffEvent[] = [];
      let canCert = false;

      try {
        const staffRes = await StaffService.getAssignedEvents({ limit: 5 });
        console.log("[Dashboard] Staff events API response:", staffRes);

        // Defensive: check for both .data.events and .events
        if (Array.isArray(staffRes.data?.events)) {
          eventsArr = staffRes.data.events;
        } else if (Array.isArray((staffRes as any).events)) {
          eventsArr = (staffRes as any).events;
        }

        // Check if any staff assignment has certification permissions
        canCert = eventsArr.some(
          (e: any) =>
            e.permissions?.can_view_stats ||
            e.permissions?.can_create_certificate
        );
      } catch (err) {
        console.error("[Dashboard] Error fetching staff events:", err);
      }

      // Store metadata in localStorage for navigation
      localStorage.setItem(
        "dashboard_has_organized",
        (orgEventsArr.length > 0).toString()
      );
      localStorage.setItem(
        "dashboard_has_registrations",
        (regList.length > 0).toString()
      );
      localStorage.setItem(
        "dashboard_has_staff",
        (eventsArr.length > 0).toString()
      );
      localStorage.setItem("dashboard_staff_can_cert", canCert.toString());

      return {
        events: orgEventsArr,
        registrations: regList,
        staffEvents: eventsArr,
      };
    },
    [isAuthenticated, accessToken], // Re-fetch when auth changes
    5 * 60 * 1000 // Cache for 5 minutes
  );

  // Extract data from cached response
  const events = dashboardData?.events || [];
  const registrations = dashboardData?.registrations || [];
  const staffEvents = dashboardData?.staffEvents || [];

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      clearAuth();
      navigate("/login");
    }
  }, [isAuthenticated, accessToken, clearAuth, navigate]);

  // Stats
  const totalOrganized = events.length;
  const totalStaff = staffEvents.length;
  const totalParticipated = registrations.length;

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-purple-700">
            {loading ? "..." : totalOrganized}
          </div>
          <div className="text-gray-500 mt-2">Events Organized</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-blue-700">
            {loading ? "..." : totalStaff}
          </div>
          <div className="text-gray-500 mt-2">Staff Assignments</div>
        </div>
        <div className="bg-white rounded-2xl shadow p-6 text-center">
          <div className="text-3xl font-bold text-green-700">
            {loading ? "..." : totalParticipated}
          </div>
          <div className="text-gray-500 mt-2">Events Participated</div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Organizer Events */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-purple-700">
              Organizer For
            </h2>
            {events.length >= 5 && (
              <Link
                to="/my-events/organizer"
                className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline"
              >
                View All
              </Link>
            )}
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {events.length === 0 && (
                <li className="text-gray-400 text-sm">No events organized.</li>
              )}
              {events.map((event) => (
                <Link
                  to={`/events/${event.id}`}
                  className="font-medium text-purple-600 hover:underline"
                  key={event.id}
                >
                  <li className="flex flex-col bg-purple-50 rounded-xl p-3 mb-2">
                    <span
                      className="truncate font-semibold mb-2"
                      title={
                        isTruncated(event.title, 50) ? event.title : undefined
                      }
                    >
                      {truncateText(event.title, 50)}
                    </span>
                    <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {truncateText(event.location, 40)}
                      </span>
                      {isTruncated(event.location, 40) && (
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg">
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      {new Date(event.start_date).toLocaleDateString()}
                    </div>
                  </li>
                </Link>
              ))}
            </ul>
          )}
        </div>
        {/* Staff Events */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-blue-700">Staff For</h2>
            {staffEvents.length >= 5 && (
              <Link
                to="/my-events/staff"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
              >
                View All
              </Link>
            )}
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : staffEvents.length === 0 ? (
            <ul className="space-y-2">
              <li className="text-gray-400 text-sm">No staff assignments.</li>
            </ul>
          ) : (
            <ul className="space-y-2">
              {staffEvents.map((event) => (
                <Link
                  to={`/events/${event.id}/check-in`}
                  className="font-medium text-primary-600 hover:underline"
                  key={event.id}
                >
                  <li className="flex flex-col bg-blue-50 rounded-xl mb-2 p-3">
                    <span
                      className="truncate font-semibold mb-2"
                      title={
                        isTruncated(event.title, 50) ? event.title : undefined
                      }
                    >
                      {truncateText(event.title, 50)}
                    </span>
                    <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
                      <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                      <span className="truncate">
                        {truncateText(event.location, 40)}
                      </span>
                      {isTruncated(event.location, 40) && (
                        <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg">
                          {event.location}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500">
                      <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                      {new Date(event.start_date).toLocaleDateString()}
                    </div>
                  </li>
                </Link>
              ))}
            </ul>
          )}
        </div>
        {/* Participant Events */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-green-700">
              Participating In
            </h2>
            {registrations.length >= 5 && (
              <Link
                to="/my-events/participant"
                className="text-sm text-green-600 hover:text-green-700 font-medium hover:underline"
              >
                View All
              </Link>
            )}
          </div>
          {loading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {registrations.length === 0 && (
                <li className="text-gray-400 text-sm">
                  No event registrations.
                </li>
              )}
              {registrations.map(
                (reg) =>
                  reg.event && (
                    <Link
                      to={`/events/${reg.event.id}`}
                      className="font-medium text-green-600 hover:underline"
                      key={reg.id}
                    >
                      <li className="flex flex-col bg-green-50 p-3 mb-2 rounded-xl">
                        <span
                          className="truncate font-semibold mb-2"
                          title={
                            isTruncated(reg.event.title, 50)
                              ? reg.event.title
                              : undefined
                          }
                        >
                          {truncateText(reg.event.title, 50)}
                        </span>
                        <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
                          <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                          <span className="truncate">
                            {truncateText(reg.event.location, 40)}
                          </span>
                          {isTruncated(reg.event.location, 40) && (
                            <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg">
                              {reg.event.location}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
                          {new Date(reg.event.start_date).toLocaleDateString()}
                        </div>
                      </li>
                    </Link>
                  )
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
