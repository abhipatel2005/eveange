import React, { useState, useEffect } from "react";
import {
  Upload,
  FileText,
  Settings,
  Trash2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";

// Import the API client
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001/api";

// Helper function to get current token
const getCurrentToken = () => {
  const authState = useAuthStore.getState();
  return authState.accessToken;
};

const api = {
  get: async (endpoint: string) => {
    const token = getCurrentToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    return { data: await response.json() };
  },
  post: async (endpoint: string, data?: any) => {
    const token = getCurrentToken();
    const headers: any = {
      Authorization: `Bearer ${token}`,
    };

    if (!(data instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers,
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
    return { data: await response.json() };
  },
  put: async (endpoint: string, data: any) => {
    const token = getCurrentToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return { data: await response.json() };
  },
  delete: async (endpoint: string) => {
    const token = getCurrentToken();
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return { data: await response.json() };
  },
};

interface TemplateData {
  id: string;
  name: string;
  type: "canvas" | "powerpoint";
  template: any;
  created_at: string;
  event_id: string;
}

interface DataField {
  key: string;
  label: string;
  description: string;
}

interface PlaceholderMappingModalProps {
  template: TemplateData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (mapping: Record<string, string>) => void;
  dataFields: DataField[];
}

const PlaceholderMappingModal: React.FC<PlaceholderMappingModalProps> = ({
  template,
  isOpen,
  onClose,
  onSave,
  dataFields,
}) => {
  const [mapping, setMapping] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template?.template?.placeholder_mapping) {
      setMapping(template.template.placeholder_mapping);
    }
  }, [template]);

  const handleSave = () => {
    onSave(mapping);
    onClose();
  };

  const placeholders = template?.template?.placeholders || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              Map Placeholders - {template?.name}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  Map the placeholders found in your PowerPoint template to data
                  fields that will be populated when generating certificates.
                </span>
              </div>
            </div>

            {placeholders.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-yellow-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    No placeholders found in the template. Make sure your
                    PowerPoint file contains placeholders in the format{" "}
                    {"{{placeholder_name}}"}.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Placeholder Mapping</h3>
                {placeholders.map((placeholder: string) => (
                  <div
                    key={placeholder}
                    className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg"
                  >
                    <div>
                      <label className="text-sm font-medium">
                        Placeholder:{" "}
                        <code className="bg-gray-100 px-2 py-1 rounded">
                          {"{{" + placeholder + "}}"}
                        </code>
                      </label>
                    </div>
                    <div>
                      <label
                        htmlFor={`mapping-${placeholder}`}
                        className="block text-sm font-medium mb-1"
                      >
                        Map to Data Field
                      </label>
                      <select
                        id={`mapping-${placeholder}`}
                        value={mapping[placeholder] || ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [placeholder]: e.target.value,
                          }))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value="">-- No mapping --</option>
                        {dataFields.map((field) => (
                          <option key={field.key} value={field.key}>
                            {field.label} - {field.description}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Mapping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface CertificateTemplatesProps {
  eventId: string;
}

const CertificateTemplates: React.FC<CertificateTemplatesProps> = ({
  eventId,
}) => {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [dataFields, setDataFields] = useState<DataField[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [mappingTemplate, setMappingTemplate] = useState<TemplateData | null>(
    null
  );
  const [showMappingModal, setShowMappingModal] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadDataFields();
  }, [eventId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/certificates/templates?eventId=${eventId}`
      );
      if (response.data.success) {
        setTemplates(response.data.data || []);
      }
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  const loadDataFields = async () => {
    try {
      const response = await api.get("/certificates/data-fields");
      if (response.data.success) {
        setDataFields(response.data.data);
      }
    } catch (error: any) {
      console.error("Failed to load data fields:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (
        file.type.includes("presentation") ||
        file.name.endsWith(".pptx") ||
        file.name.endsWith(".ppt")
      ) {
        setSelectedFile(file);
        setError(null);
        if (!templateName) {
          setTemplateName(file.name.replace(/\.(pptx?|ppt)$/i, ""));
        }
      } else {
        setError("Please select a PowerPoint file (.ppt or .pptx)");
        setSelectedFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !templateName.trim()) {
      setError("Please select a file and enter a template name");
      return;
    }

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append("template", selectedFile);
      formData.append("eventId", eventId);
      formData.append("name", templateName.trim());
      formData.append(
        "type",
        selectedFile.type.includes("powerpoint") ||
          selectedFile.name.endsWith(".pptx")
          ? "powerpoint"
          : "canvas"
      );

      const response = await api.post(
        "/certificates/templates/upload",
        formData
      );

      if (response.data.success) {
        setSuccess("Template uploaded successfully!");
        setSelectedFile(null);
        setTemplateName("");

        // Reset file input
        const fileInput = document.getElementById(
          "template-file"
        ) as HTMLInputElement;
        if (fileInput) fileInput.value = "";

        // Reload templates
        await loadTemplates();

        // If placeholders were found but no mapping was provided, open mapping modal
        if (response.data.data.needs_mapping) {
          const newTemplate = response.data.data.template;
          setMappingTemplate(newTemplate);
          setShowMappingModal(true);
        }
      }
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to upload template");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await api.delete(
        `/certificates/templates/${templateId}`
      );
      if (response.data.success) {
        setSuccess("Template deleted successfully!");
        await loadTemplates();
      }
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to delete template");
    }
  };

  const handleSaveMapping = async (mapping: Record<string, string>) => {
    if (!mappingTemplate) return;

    try {
      const response = await api.put(
        `/certificates/templates/${mappingTemplate.id}/mapping`,
        {
          placeholderMapping: mapping,
        }
      );

      if (response.data.success) {
        setSuccess("Placeholder mapping saved successfully!");
        await loadTemplates();
      }
    } catch (error: any) {
      setError(error.response?.data?.error || "Failed to save mapping");
    }
  };

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-64"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Certificate Templates</h2>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <button
              onClick={clearMessages}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <span>{success}</span>
            <button
              onClick={clearMessages}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Upload Section */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Upload className="h-5 w-5" />
            <h3 className="text-lg font-semibold">
              Upload PowerPoint Template
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="template-name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Template Name
              </label>
              <input
                id="template-name"
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Enter template name"
                disabled={uploading}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="template-file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                PowerPoint File (.ppt, .pptx)
              </label>
              <input
                id="template-file"
                type="file"
                accept=".ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
                onChange={handleFileSelect}
                disabled={uploading}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-1">
                  Selected: {selectedFile.name} (
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4 mt-0.5" />
                <div className="text-sm">
                  <strong>Tip:</strong> Use placeholders like{" "}
                  {"{{participant_name}}"}, {"{{event_title}}"},{" "}
                  {"{{certificate_code}}"} in your PowerPoint template. These
                  will be replaced with actual data when generating
                  certificates.
                </div>
              </div>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || !templateName.trim() || uploading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? "Uploading..." : "Upload Template"}
            </button>
          </div>
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available Templates</h3>
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm p-6"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <h4 className="font-medium">{template.name}</h4>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      template.type === "powerpoint"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {template.type === "powerpoint" ? "PowerPoint" : "Canvas"}
                  </span>
                </div>

                {template.template?.placeholders &&
                  template.template.placeholders.length > 0 && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Placeholders:</span>{" "}
                      {template.template.placeholders.map((p: string) => (
                        <code
                          key={p}
                          className="bg-gray-100 px-1 py-0.5 rounded text-xs mx-0.5"
                        >
                          {"{{" + p + "}}"}
                        </code>
                      ))}
                    </div>
                  )}

                {template.created_at && (
                  <p className="text-xs text-gray-500">
                    Created:{" "}
                    {new Date(template.created_at).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                {template.type === "powerpoint" &&
                  template.template?.placeholders?.length > 0 && (
                    <button
                      onClick={() => {
                        setMappingTemplate(template);
                        setShowMappingModal(true);
                      }}
                      className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      <Settings className="h-4 w-4" />
                      Map Data
                    </button>
                  )}

                {template.id !== "default" && (
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Placeholder Mapping Modal */}
      {mappingTemplate && (
        <PlaceholderMappingModal
          template={mappingTemplate}
          isOpen={showMappingModal}
          onClose={() => {
            setShowMappingModal(false);
            setMappingTemplate(null);
          }}
          onSave={handleSaveMapping}
          dataFields={dataFields}
        />
      )}
    </div>
  );
};

export default CertificateTemplates;
