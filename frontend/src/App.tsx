import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import CreateEventPage from "./pages/CreateEventPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import RegistrationFormPage from "./pages/RegistrationFormPage";
import RegistrationFormBuilder from "./pages/RegistrationFormBuilder";
import MyRegistrationsPage from "./pages/MyRegistrationsPage";
import EventRegistrationsPage from "./pages/EventRegistrationsPage";
import AttendancePage from "./pages/AttendancePage";
import CertificateManagementPage from "./pages/CertificateManagementPage";
import CertificateVerificationPage from "./pages/CertificateVerificationPage";
import CheckInPage from "./pages/CheckInPage";
import ParticipantTicketPage from "./pages/ParticipantTicketPage";
import AdminDashboard from "./pages/AdminDashboard";
import EventsPage from "./pages/EventsPage";
import QRScannerPage from "./pages/QRScannerPage";

function App() {
  const validateToken = useAuthStore((state) => state.validateToken);

  // Validate token on app initialization
  useEffect(() => {
    validateToken();
  }, [validateToken]);
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/events" element={<EventsPage />} />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/create"
          element={
            <ProtectedRoute requireOrganizer>
              <CreateEventPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventDetailsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/form-builder"
          element={
            <ProtectedRoute requireOrganizer>
              <RegistrationFormBuilder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/registrations"
          element={
            <ProtectedRoute requireOrganizer>
              <EventRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/attendance"
          element={
            <ProtectedRoute requireOrganizer>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/certificates"
          element={
            <ProtectedRoute requireOrganizer>
              <CertificateManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificate/verify"
          element={<CertificateVerificationPage />}
        />

        {/* Admin Dashboard */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireAdmin>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Check-in system for staff */}
        <Route
          path="/events/:eventId/check-in"
          element={
            <ProtectedRoute>
              <CheckInPage />
            </ProtectedRoute>
          }
        />

        {/* QR Scanner for organizers, staff, and admins */}
        <Route
          path="/scanner"
          element={
            <ProtectedRoute requireOrganizer>
              <QRScannerPage />
            </ProtectedRoute>
          }
        />

        {/* Participant ticket */}
        <Route
          path="/ticket/:registrationId"
          element={
            <ProtectedRoute>
              <ParticipantTicketPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/my-registrations"
          element={
            <ProtectedRoute>
              <MyRegistrationsPage />
            </ProtectedRoute>
          }
        />

        {/* Public registration form */}
        <Route path="/events/:id/register" element={<RegistrationFormPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
