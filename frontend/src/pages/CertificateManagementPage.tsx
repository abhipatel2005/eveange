import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  AlertCircle,
  Upload,
  Trash2,
  Settings,
  CheckCircle,
  Edit,
} from "lucide-react";
import { apiClient } from "@/api/client";
import { Loader } from "../components/common/Loader";

interface CertificateTemplate {
  id: string;
  name: string;
  type: "canvas" | "powerpoint";
  file_path?: string;
  placeholder_mapping: Record<string, string>;
  extracted_placeholders?: string[];
  created_at: string;
  updated_at: string;
}

interface DataField {
  key: string;
  label: string;
  description: string;
  category: "participant" | "event" | "registration" | "system";
  dataType: "text" | "date" | "number" | "email" | "phone";
  example?: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  registration_date: string;
  attendance_date?: string;
  registration_id: string;
  custom_fields: Record<string, any>;
}

interface Certificate {
  id: string;
  event_id: string;
  registration_id: string;
  file_url: string;
  certificate_url?: string;
  verification_code: string;
  issued_by_id: string;
  created_at: string;
  email_sent: boolean;
  email_sent_at?: string;
  email_sent_by?: string;
  registrations: {
    id: string;
    name: string;
    email: string;
  };
  events: {
    id: string;
    title: string;
  };
}

const CertificateManagementPage: React.FC = () => {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [activeTab, setActiveTab] = useState<"generated" | "generate">(
    "generated"
  );
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [showPlaceholderMapping, setShowPlaceholderMapping] = useState(false);
  const [mappingTemplate, setMappingTemplate] =
    useState<CertificateTemplate | null>(null);

  // File upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadType, setUploadType] = useState<"canvas" | "powerpoint">(
    "powerpoint"
  );
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [templatesRes, dataFieldsRes, participantsRes, certificatesRes] =
        await Promise.all([
          apiClient.get(`/certificates/templates?eventId=${eventId}`),
          apiClient.get("/certificates/data-fields"),
          apiClient.get(`/certificates/events/${eventId}/participants`),
          apiClient.get(`/certificates/events/${eventId}/certificates`),
        ]);

      const templatesData =
        (templatesRes.data as any)?.data || templatesRes.data || [];
      setTemplates(templatesData);

      const dataFieldsData =
        (dataFieldsRes.data as any)?.data || dataFieldsRes.data || [];
      setDataFields(dataFieldsData);

      const participantsData =
        (participantsRes.data as any)?.data || participantsRes.data || [];
      setParticipants(participantsData);

      const certificatesData =
        (certificatesRes.data as any)?.data || certificatesRes.data || [];
      setCertificates(certificatesData);
    } catch (error) {
      console.error("Error loading data:", error);
      showMessage("error", "Failed to load certificate data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile || !uploadName) {
      showMessage("error", "Please select a file and provide a template name");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("template", uploadFile);
      formData.append("name", uploadName);
      formData.append("type", uploadType);
      if (eventId) {
        formData.append("eventId", eventId);
        console.log("Uploading template for eventId:", eventId);
      } else {
        console.log("No eventId found!");
      }

      const response = await apiClient.post(
        "/certificates/templates",
        formData
      );

      const responseData = response.data as any;
      console.log("Upload response:", responseData);
      showMessage(
        "success",
        responseData?.data?.message || "Template uploaded successfully"
      );

      // Reset form
      setUploadFile(null);
      setUploadName("");
      setUploadType("powerpoint");

      // Reload templates
      await loadData();

      // If placeholders were extracted, show mapping interface
      if (
        responseData?.data?.placeholders &&
        responseData.data.placeholders.length > 0
      ) {
        setMappingTemplate(responseData.data.template);
        setShowPlaceholderMapping(true);
      }
    } catch (error: any) {
      console.error("Error uploading template:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to upload template"
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handlePlaceholderMapping = async (mapping: Record<string, string>) => {
    if (!mappingTemplate) return;

    try {
      await apiClient.put(
        `/certificates/templates/${mappingTemplate.id}/mapping`,
        {
          placeholderMapping: mapping,
        }
      );

      showMessage("success", "Placeholder mapping updated successfully");
      setShowPlaceholderMapping(false);
      setMappingTemplate(null);
      await loadData();
    } catch (error: any) {
      console.error("Error updating mapping:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to update mapping"
      );
    }
  };

  const handleGenerateCertificates = async () => {
    if (!selectedTemplate) {
      showMessage("error", "Please select a template");
      return;
    }

    try {
      setIsGenerating(true);
      const response = await apiClient.post(
        `/certificates/events/${eventId}/generate`,
        {
          templateId: selectedTemplate,
          participantIds:
            selectedParticipants.length > 0 ? selectedParticipants : undefined,
        }
      );

      const responseData = response.data as any;
      const summary = responseData?.summary;

      showMessage(
        "success",
        `Generated ${summary?.successful || 0} certificates successfully${
          summary?.failed > 0 ? `, ${summary.failed} failed` : ""
        }`
      );

      // Reset selections and reload data to show new certificates
      setSelectedParticipants([]);
      await loadData();
    } catch (error: any) {
      console.error("Error generating certificates:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to generate certificates"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      await apiClient.delete(`/certificates/templates/${templateId}`);
      showMessage("success", "Template deleted successfully");
      await loadData();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      showMessage(
        "error",
        error.response?.data?.message || "Failed to delete template"
      );
    }
  };

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(participantId)
        ? prev.filter((id) => id !== participantId)
        : [...prev, participantId]
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader size="lg" text="Loading certificate data..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            Certificate Management
          </h1>
          <Button onClick={() => navigate(-1)} variant="outline">
            Back to Event
          </Button>
        </div>

        {/* Message Display */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {message.type === "success" ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <AlertCircle className="h-5 w-5" />
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-2 border-b mb-6">
          <button
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === "generate"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500"
            }`}
            onClick={() => setActiveTab("generate")}
          >
            Generate Certificates
          </button>
          <button
            className={`px-4 py-2 font-medium border-b-2 ${
              activeTab === "generated"
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-gray-500"
            }`}
            onClick={() => setActiveTab("generated")}
          >
            Generated Certificates
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "generated" && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">
              Participants with Certificates
            </h2>
            {certificates.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">
                  No certificates have been generated yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Participant
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Verification Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Generated Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Email Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {certificates.map((certificate) => (
                      <tr key={certificate.id}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                          {certificate.registrations?.name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {certificate.registrations?.email || "Unknown"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                            {certificate.verification_code}
                          </code>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(
                            certificate.created_at
                          ).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {certificate.email_sent ? (
                            <div className="flex items-center">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Sent
                              </span>
                              {certificate.email_sent_at && (
                                <span className="ml-2 text-xs text-gray-400">
                                  {new Date(
                                    certificate.email_sent_at
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Not Sent
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (certificate.file_url) {
                                  window.open(certificate.file_url, "_blank");
                                } else {
                                  showMessage(
                                    "error",
                                    "Certificate file not available"
                                  );
                                }
                              }}
                            >
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                try {
                                  await apiClient.post(
                                    `/certificates/events/${eventId}/email`,
                                    { certificateIds: [certificate.id] }
                                  );
                                  showMessage(
                                    "success",
                                    "Certificate emailed successfully"
                                  );
                                } catch (error: any) {
                                  console.error(
                                    "Error emailing certificate:",
                                    error
                                  );
                                  showMessage(
                                    "error",
                                    "Failed to email certificate"
                                  );
                                }
                              }}
                            >
                              Email
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "generate" && (
          <>
            {/* Template Upload Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Template
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={uploadName}
                    onChange={(e) => setUploadName(e.target.value)}
                    placeholder="Enter template name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Type
                  </label>
                  <select
                    value={uploadType}
                    onChange={(e) =>
                      setUploadType(e.target.value as "canvas" | "powerpoint")
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="powerpoint">PowerPoint (.pptx)</option>
                    <option value="canvas">Canvas (Programmatic)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template File
                  </label>
                  <input
                    type="file"
                    accept=".pptx,.png,.jpg,.jpeg"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <Button
                onClick={handleFileUpload}
                disabled={isUploading || !uploadFile || !uploadName}
                className="w-full md:w-auto"
              >
                {isUploading ? "Uploading..." : "Upload Template"}
              </Button>
            </div>

            {/* Templates List */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Available Templates
              </h2>
              {templates.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No templates available. Upload a template to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Template for Generation
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Choose a template</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.type})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Placeholders
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {templates.map((template) => {
                          const placeholderCount =
                            template.extracted_placeholders?.length || 0;
                          const mappedCount = Object.values(
                            template.placeholder_mapping || {}
                          ).filter(Boolean).length;
                          const isConfigured =
                            placeholderCount === 0 ||
                            placeholderCount === mappedCount;
                          return (
                            <tr key={template.id}>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                {template.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    template.type === "powerpoint"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-gray-100 text-gray-800"
                                  }`}
                                >
                                  {template.type}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-500">
                                {placeholderCount > 0 ? (
                                  <div className="space-y-1">
                                    <div className="font-medium">
                                      {mappedCount}/{placeholderCount} mapped
                                    </div>
                                    {template.extracted_placeholders?.map(
                                      (placeholder, idx) => {
                                        const mappedField =
                                          template.placeholder_mapping?.[
                                            placeholder
                                          ];
                                        return (
                                          <div key={idx} className="text-xs">
                                            <code className="bg-gray-100 px-1 rounded">
                                              {placeholder}
                                            </code>
                                            {mappedField ? (
                                              <span className="text-green-600 ml-1">
                                                → {mappedField}
                                              </span>
                                            ) : (
                                              <span className="text-red-500 ml-1">
                                                → unmapped
                                              </span>
                                            )}
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                ) : (
                                  "None"
                                )}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span
                                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                    isConfigured
                                      ? "bg-green-100 text-green-800"
                                      : "bg-red-100 text-red-800"
                                  }`}
                                >
                                  {isConfigured
                                    ? "Ready"
                                    : "Needs Configuration"}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <div className="flex gap-2">
                                  {placeholderCount > 0 && (
                                    <button
                                      onClick={() => {
                                        setMappingTemplate(template);
                                        setShowPlaceholderMapping(true);
                                      }}
                                      className="text-blue-600 hover:text-blue-900"
                                      title={
                                        isConfigured
                                          ? "Edit mapping"
                                          : "Configure mapping"
                                      }
                                    >
                                      {isConfigured ? (
                                        <Edit className="h-4 w-4" />
                                      ) : (
                                        <Settings className="h-4 w-4" />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      handleDeleteTemplate(template.id)
                                    }
                                    className="text-red-600 hover:text-red-900"
                                    title="Delete template"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Participants Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">
                Select Participants ({participants.length} eligible)
              </h2>
              {participants.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">
                    No eligible participants found. Only participants who
                    attended the event can receive certificates.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex gap-2 items-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setSelectedParticipants(participants.map((p) => p.id))
                      }
                    >
                      Select All
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedParticipants([])}
                    >
                      Clear Selection
                    </Button>
                    <Button
                      size="sm"
                      disabled={
                        selectedParticipants.length === 0 ||
                        !selectedTemplate ||
                        isGenerating
                      }
                      onClick={handleGenerateCertificates}
                    >
                      {isGenerating
                        ? "Generating..."
                        : `Generate Certificates (${selectedParticipants.length})`}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Select
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Email
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Registration Date
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {participants.map((participant) => {
                          const alreadyHasCertificate = certificates.some(
                            (c) =>
                              c.registration_id === participant.registration_id
                          );
                          if (alreadyHasCertificate) return null;
                          return (
                            <tr key={participant.id}>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={selectedParticipants.includes(
                                    participant.id
                                  )}
                                  onChange={() =>
                                    toggleParticipantSelection(participant.id)
                                  }
                                  className="rounded"
                                />
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                {participant.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {participant.email}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {new Date(
                                  participant.registration_date
                                ).toLocaleDateString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Placeholder Mapping Modal */}
        {showPlaceholderMapping && mappingTemplate ? (
          <PlaceholderMappingModal
            template={mappingTemplate}
            dataFields={dataFields}
            onSave={handlePlaceholderMapping}
            onClose={() => {
              setShowPlaceholderMapping(false);
              setMappingTemplate(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
};

interface PlaceholderMappingModalProps {
  template: CertificateTemplate;
  dataFields: DataField[];
  onSave: (mapping: Record<string, string>) => void;
  onClose: () => void;
}

const PlaceholderMappingModal: React.FC<PlaceholderMappingModalProps> = ({
  template,
  dataFields,
  onSave,
  onClose,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>(
    template.placeholder_mapping || {}
  );

  const handleSave = () => {
    onSave(mapping);
  };

  const groupedFields = dataFields.reduce((groups, field) => {
    if (!groups[field.category]) {
      groups[field.category] = [];
    }
    groups[field.category].push(field);
    return groups;
  }, {} as Record<string, DataField[]>);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto m-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Configure Placeholder Mapping</h2>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>

        <p className="text-gray-600 mb-6">
          Map the placeholders found in your template to data fields from the
          database.
        </p>

        <div className="space-y-4">
          {template.extracted_placeholders?.map((placeholder) => (
            <div key={placeholder} className="border rounded-lg p-4">
              <label className="block text-lg font-medium mb-2">
                Placeholder:{" "}
                <code className="bg-gray-100 px-2 py-1 rounded">
                  {"{{" + placeholder + "}}"}
                </code>
              </label>
              <select
                value={mapping[placeholder] || ""}
                onChange={(e) =>
                  setMapping((prev) => ({
                    ...prev,
                    [placeholder]: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a data field</option>
                {Object.entries(groupedFields).map(([category, fields]) => (
                  <optgroup key={category} label={category.toUpperCase()}>
                    {fields.map((field) => (
                      <option key={field.key} value={field.key}>
                        {field.label} - {field.description}
                        {field.example && ` (e.g., ${field.example})`}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-6">
          <Button onClick={handleSave} className="flex-1">
            Save Mapping
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CertificateManagementPage;
