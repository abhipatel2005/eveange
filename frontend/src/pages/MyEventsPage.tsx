import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { EventService, Event } from "../api/events";
import { StaffService, StaffEvent } from "../api/staff";
import { RegistrationService, Registration } from "../api/registrations";
import { truncateText, isTruncated } from "../utils/textUtils";
import { MapPin, Calendar, ArrowLeft } from "lucide-react";
import { Loader } from "../components/common/Loader";

type EventRole = "organizer" | "staff" | "participant";

const MyEventsPage: React.FC = () => {
  const { role } = useParams<{ role: EventRole }>();
  const navigate = useNavigate();
  const { accessToken, isAuthenticated, clearAuth } = useAuthStore();
  const [events, setEvents] = useState<Event[]>([]);
  const [staffEvents, setStaffEvents] = useState<StaffEvent[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !accessToken) {
      clearAuth();
      navigate("/login");
      return;
    }
    fetchEvents();
  }, [role, isAuthenticated, accessToken]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      if (role === "organizer") {
        const res = await EventService.getMyEvents();
        setEvents(res.data?.events || []);
      } else if (role === "staff") {
        const res = await StaffService.getAssignedEvents();
        const eventsArr = res.data?.events || [];
        setStaffEvents(Array.isArray(eventsArr) ? eventsArr : []);
      } else if (role === "participant") {
        const res = await RegistrationService.getUserRegistrations();
        setRegistrations(res.data?.registrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch events:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTitleAndColor = () => {
    switch (role) {
      case "organizer":
        return {
          title: "Events I Organize",
          color: "purple",
          bgColor: "bg-purple-50",
          textColor: "text-purple-700",
          linkColor: "text-purple-600",
        };
      case "staff":
        return {
          title: "My Staff Assignments",
          color: "blue",
          bgColor: "bg-blue-50",
          textColor: "text-blue-700",
          linkColor: "text-blue-600",
        };
      case "participant":
        return {
          title: "Events I'm Participating In",
          color: "green",
          bgColor: "bg-green-50",
          textColor: "text-green-700",
          linkColor: "text-green-600",
        };
      default:
        return {
          title: "My Events",
          color: "gray",
          bgColor: "bg-gray-50",
          textColor: "text-gray-700",
          linkColor: "text-gray-600",
        };
    }
  };

  const { title, bgColor, textColor, linkColor } = getTitleAndColor();

  const renderEventList = () => {
    if (role === "organizer") {
      return events.map((event) => (
        <Link
          to={`/events/${event.id}`}
          className={`font-medium ${linkColor} hover:underline`}
          key={event.id}
        >
          <li
            className={`flex flex-col ${bgColor} rounded-xl p-4 mb-3 hover:shadow-md transition-shadow`}
          >
            <span
              className="truncate font-semibold mb-2"
              title={isTruncated(event.title, 80) ? event.title : undefined}
            >
              {truncateText(event.title, 80)}
            </span>
            <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {truncateText(event.location, 60)}
              </span>
              {isTruncated(event.location, 60) && (
                <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block z-10 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1 px-2 shadow-lg">
                  {event.location}
                </div>
              )}
            </div>
            <div className="flex items-center text-xs text-gray-500">
              <Calendar className="w-3 h-3 mr-1 flex-shrink-0" />
              {new Date(event.start_date).toLocaleDateString()} -{" "}
              {new Date(event.end_date).toLocaleDateString()}
            </div>
          </li>
        </Link>
      ));
    } else if (role === "staff") {
      return staffEvents.map((event) => (
        <Link
          to={`/events/${event.id}/check-in`}
          className={`font-medium ${linkColor} hover:underline`}
          key={event.id}
        >
          <li
            className={`flex flex-col ${bgColor} rounded-xl p-4 mb-3 hover:shadow-md transition-shadow`}
          >
            <span
              className="truncate font-semibold mb-2"
              title={isTruncated(event.title, 80) ? event.title : undefined}
            >
              {truncateText(event.title, 80)}
            </span>
            <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
              <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">
                {truncateText(event.location, 60)}
              </span>
              {isTruncated(event.location, 60) && (
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
      ));
    } else if (role === "participant") {
      return registrations.map(
        (reg) =>
          reg.event && (
            <Link
              to={`/events/${reg.event.id}`}
              className={`font-medium ${linkColor} hover:underline`}
              key={reg.id}
            >
              <li
                className={`flex flex-col ${bgColor} rounded-xl p-4 mb-3 hover:shadow-md transition-shadow`}
              >
                <span
                  className="truncate font-semibold mb-2"
                  title={
                    isTruncated(reg.event.title, 80)
                      ? reg.event.title
                      : undefined
                  }
                >
                  {truncateText(reg.event.title, 80)}
                </span>
                <div className="flex items-center text-xs text-gray-600 mb-1 relative group">
                  <MapPin className="w-3 h-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {truncateText(reg.event.location, 60)}
                  </span>
                  {isTruncated(reg.event.location, 60) && (
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
      );
    }
    return null;
  };

  const getCount = () => {
    if (role === "organizer") return events.length;
    if (role === "staff") return staffEvents.length;
    if (role === "participant") return registrations.length;
    return 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader size="lg" text="Loading events..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/dashboard")}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </button>
          <h1 className={`text-3xl font-bold ${textColor}`}>{title}</h1>
          <p className="text-gray-600 mt-2">
            {getCount()} {getCount() === 1 ? "event" : "events"} found
          </p>
        </div>

        {/* Events List */}
        <div className="bg-white rounded-2xl shadow-md p-6">
          {getCount() === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No events found</p>
              <p className="text-gray-400 text-sm mt-2">
                {role === "organizer" && "You haven't organized any events yet"}
                {role === "staff" && "You haven't been assigned to any events"}
                {role === "participant" &&
                  "You haven't registered for any events"}
              </p>
            </div>
          ) : (
            <ul className="space-y-2">{renderEventList()}</ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyEventsPage;
