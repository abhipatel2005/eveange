import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { StaffService, StaffEvent } from "../api/staff";
import { RegistrationService, Registration } from "../api/registrations";

const DashboardPage: React.FC = () => {
  const { accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [staffEvents, setStaffEvents] = useState<StaffEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        if (!isAuthenticated || !accessToken) {
          clearAuth();
          navigate("/login");
          return;
        }
        const [myEventsRes, regRes] = await Promise.all([
          EventService.getMyEvents(),
          RegistrationService.getUserRegistrations(),
        ]);
        const orgEventsArr = myEventsRes.data?.events || [];
        setEvents(orgEventsArr);
        // Store if user is organizer for any event
        localStorage.setItem(
          "dashboard_has_organized",
          (orgEventsArr.length > 0).toString()
        );
        setRegistrations(regRes.data?.registrations || []);
        // Store registration presence for nav
        const regList = regRes.data?.registrations || [];
        localStorage.setItem(
          "dashboard_has_registrations",
          (regList.length > 0).toString()
        );
        try {
          const staffRes = await StaffService.getAssignedEvents();
          // Debug log
          console.log("[Dashboard] Staff events API response:", staffRes);
          // Defensive: check for both .data.events and .events
          let eventsArr = [];
          let canCert = false;
          if (Array.isArray(staffRes.data?.events)) {
            eventsArr = staffRes.data.events;
          } else if (Array.isArray((staffRes as any).events)) {
            eventsArr = (staffRes as any).events;
          }
          // Check if any staff assignment has can_view_stats or can_create_certificate
          canCert = eventsArr.some(
            (e: any) =>
              e.permissions?.can_view_stats ||
              e.permissions?.can_create_certificate
          );
          console.log("[Dashboard] Using staff events array:", eventsArr);
          setStaffEvents(eventsArr);
          // Store staff assignment presence for nav
          localStorage.setItem(
            "dashboard_has_staff",
            (eventsArr.length > 0).toString()
          );
          localStorage.setItem("dashboard_staff_can_cert", canCert.toString());
        } catch (err) {
          console.error("[Dashboard] Error fetching staff events:", err);
          setStaffEvents([]);
          localStorage.setItem("dashboard_has_staff", "false");
          localStorage.setItem("dashboard_staff_can_cert", "false");
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, accessToken]);

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
          <h2 className="font-semibold text-lg mb-4 text-purple-700">
            Organizer For
          </h2>
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
                >
                  <li
                    key={event.id}
                    className="flex flex-col bg-purple-50 rounded-xl p-2 mb-2"
                  >
                    {event.title}
                    <span className="text-xs text-gray-500">
                      {event.location} &middot;{" "}
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  </li>
                </Link>
              ))}
            </ul>
          )}
        </div>
        {/* Staff Events */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-lg mb-4 text-blue-700">
            Staff For
          </h2>
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
                >
                  <li
                    key={event.id}
                    className="flex flex-col bg-blue-50 rounded-xl mb-2 p-2"
                  >
                    {event.title}
                    <span className="text-xs text-gray-500">
                      {event.location} &middot;{" "}
                      {new Date(event.start_date).toLocaleDateString()}
                    </span>
                  </li>
                </Link>
              ))}
            </ul>
          )}
        </div>
        {/* Participant Events */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h2 className="font-semibold text-lg mb-4 text-green-700">
            Participating In
          </h2>
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
                    >
                      <li
                        key={reg.id}
                        className="flex flex-col bg-green-50 p-2 mb-2 rounded-xl"
                      >
                        {reg.event.title}
                        <span className="text-xs text-gray-500">
                          {reg.event.location} &middot;{" "}
                          {new Date(reg.event.start_date).toLocaleDateString()}
                        </span>
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
