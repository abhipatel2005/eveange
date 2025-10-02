import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useApiErrorHandler } from "../components/AuthErrorHandler";
import { CertificateService, Certificate } from "../api/certificates";
import { EventService, Event } from "../api/events";
import CertificateTemplatesManager from "../components/CertificateTemplatesManager";
import {
  Award,
  Download,
  Users,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader,
  ArrowLeft,
  FileText,
  Settings,
} from "lucide-react";

export default function CertificateManagementPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { handleApiError } = useApiErrorHandler();

  const [event, setEvent] = useState<Event | null>(null);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [eventHasEnded, setEventHasEnded] = useState(false);
  const [activeTab, setActiveTab] = useState<"certificates" | "templates">(
    "certificates"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>("default");

  const fetchEventAndCertificates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch event details first
      const eventResponse = await EventService.getEventById(eventId!);
      if (!eventResponse.success || !eventResponse.data) {
        setError("Event not found");
        return;
      }

      setEvent(eventResponse.data.event);

      // Check if event has ended
      const eventEndDate = new Date(eventResponse.data.event.end_date);
      const now = new Date();
      const hasEnded = now > eventEndDate;

      setEventHasEnded(hasEnded);

      // Always try to fetch certificates regardless of event status
      const certResponse = await CertificateService.getEventCertificates(
        eventId!
      );
      if (certResponse.success && certResponse.data) {
        setCertificates(certResponse.data.certificates);
      }
    } catch (err: any) {
      console.error("Error fetching data:", err);
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    if (!eventId) {
      setError("Event ID is required");
      setLoading(false);
      return;
    }

    fetchEventAndCertificates();
  }, [eventId, fetchEventAndCertificates]);

  const handleGenerateCertificates = async () => {
    if (!eventId) return;

    // Double-check event has ended before making API call
    if (!eventHasEnded) {
      setError("Cannot generate certificates until the event has ended.");
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setSuccess(null);

      const response = await CertificateService.generateCertificates(eventId, {
        templateId: selectedTemplate,
      });

      if (response.success && response.data) {
        setSuccess(
          `Successfully generated ${response.data.generated} certificate(s) out of ${response.data.total} eligible participants.`
        );

        if (response.data.errors && response.data.errors.length > 0) {
          console.warn("Certificate generation errors:", response.data.errors);
        }

        // Refresh certificates list
        await fetchEventAndCertificates();
      } else {
        setError(response.error || "Failed to generate certificates");
      }
    } catch (err: any) {
      console.error("Error generating certificates:", err);
      const errorMessage = handleApiError(err);
      setError(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadCertificate = (certificateCode: string) => {
    const downloadUrl = CertificateService.downloadCertificate(certificateCode);
    window.open(downloadUrl, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate("/login");
    return null;
  }

  if (!["organizer", "admin"].includes(user.role)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            Only event organizers and administrators can manage certificates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <Award className="h-8 w-8 mr-3 text-blue-600" />
              Certificate Management
            </h1>
            {event && (
              <p className="text-gray-600 mt-2">
                Managing certificates for:{" "}
                <span className="font-semibold">{event.title}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <p className="text-green-700">{success}</p>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("certificates")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "certificates"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Award className="h-4 w-4 inline-block mr-2" />
              Certificates
            </button>
            <button
              onClick={() => setActiveTab("templates")}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === "templates"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
            >
              <Settings className="h-4 w-4 inline-block mr-2" />
              Templates
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "templates" ? (
        <CertificateTemplatesManager eventId={eventId!} />
      ) : (
        <>
          {event && (
            <div className="space-y-6">
              {/* Event Info */}
              <div className="bg-white shadow rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Event Information
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Event Date</p>
                      <p className="font-medium">
                        {new Date(event.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <p className="font-medium text-green-600">Event Ended</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-gray-400 mr-2" />
                    <div>
                      <p className="text-sm text-gray-500">Certificates</p>
                      <p className="font-medium">
                        {certificates.length} Generated
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Certificate Actions */}
              <div className="bg-white shadow rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Certificate Generation
                  </h2>
                </div>

                <div className="mb-4">
                  <label
                    htmlFor="template-select"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Certificate Template
                  </label>
                  <select
                    id="template-select"
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="default">Default Template</option>
                    {/* Template options will be populated by the template manager */}
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateCertificates}
                    disabled={generating || !eventHasEnded}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {generating ? (
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Award className="h-4 w-4 mr-2" />
                    )}
                    {generating
                      ? "Generating..."
                      : !eventHasEnded
                      ? "Event Must End First"
                      : "Generate Certificates"}
                  </button>
                </div>

                {!eventHasEnded && event ? (
                  <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-md">
                    <div className="flex items-center">
                      <Clock className="h-5 w-5 text-amber-600 mr-2" />
                      <div>
                        <p className="text-amber-800 font-medium">
                          Event Still in Progress
                        </p>
                        <p className="text-amber-700 text-sm mt-1">
                          Certificates can only be generated after the event
                          ends on{" "}
                          <span className="font-medium">
                            {new Date(event.end_date).toLocaleDateString()} at{" "}
                            {new Date(event.end_date).toLocaleTimeString()}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}

                <p className="text-gray-600 text-sm">
                  Generate certificates for all participants who attended this
                  event. Only participants who checked in will receive
                  certificates.
                </p>
              </div>

              {/* Certificates List */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Generated Certificates ({certificates.length})
                  </h2>
                </div>

                {certificates.length === 0 ? (
                  <div className="p-6 text-center">
                    <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">
                      No certificates generated yet
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      Click "Generate Certificates" to create certificates for
                      attended participants
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Participant
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Certificate Code
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Issued Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {certificates.map((certificate) => (
                          <tr key={certificate.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="font-medium text-gray-900">
                                  {certificate.participant_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {certificate.participant_email}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                                {certificate.certificate_code}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(
                                certificate.issued_at
                              ).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={() =>
                                  handleDownloadCertificate(
                                    certificate.certificate_code
                                  )
                                }
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                              >
                                <Download className="h-4 w-4 mr-1" />
                                Download
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
