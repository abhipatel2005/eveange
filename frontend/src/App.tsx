import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { useAuthStore } from "./store/authStore";
import "./utils/authCleanup"; // Import to run cleanup on app startup
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
import CertificatesListPage from "./pages/CertificatesListPage";
import CertificateVerificationPage from "./pages/CertificateVerificationPage";
import CheckInPage from "./pages/CheckInPage";
import ParticipantTicketPage from "./pages/ParticipantTicketPage";
import AdminDashboard from "./pages/AdminDashboard";
import EventsPage from "./pages/EventsPage";
import QRScannerPage from "./pages/QRScannerPage";
import PaymentPage from "./pages/PaymentPage";
import EmailVerificationPage from "./pages/EmailVerificationPage";

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
        <Route path="/verify-email" element={<EmailVerificationPage />} />
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
            <ProtectedRoute>
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
            <ProtectedRoute>
              <EventRegistrationsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/attendance"
          element={
            <ProtectedRoute>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates"
          element={
            <ProtectedRoute>
              <CertificatesListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/certificates/:id"
          element={
            <ProtectedRoute>
              <CertificateManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id/certificates"
          element={
            <ProtectedRoute>
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
            <ProtectedRoute requireOrganizer allowStaff>
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

        {/* Payment page */}
        <Route
          path="/events/:id/payment"
          element={
            <ProtectedRoute>
              <PaymentPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
