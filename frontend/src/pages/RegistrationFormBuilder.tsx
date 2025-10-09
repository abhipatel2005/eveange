import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Plus,
  Settings,
  Eye,
  Save,
  Trash2,
  Share2,
  ArrowLeft,
  Layers,
  FileText,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { useEventStore } from "../store/eventStore.ts";
import { useFormBuilderStore } from "../store/formBuilderStore";
import { FormField } from "../api/registrationForms";
import { FormTemplateModal } from "../components/forms/FormTemplateModal.tsx";
import { ShareFormModal } from "../components/forms/ShareFormModal.tsx";

export default function RegistrationFormBuilder() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [showPreview, setShowPreview] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(
    null
  );

  const {
    events,
    selectedEvent,
    loadEvent,
    isLoading: eventLoading,
  } = useEventStore();
  const {
    form,
    templates,
    activeFieldId,
    isMultiStep,
    currentStep,
    isLoading,
    isSaving,
    setActiveFieldId,
    setIsMultiStep,
    setCurrentStep,
    addField,
    updateField,
    removeField,
    reorderFields,
    addStep,
    removeStep,
    applyTemplate,
    loadFormTemplates,
    loadRegistrationForm,
    saveRegistrationForm,
    createRegistrationForm,
    deleteRegistrationForm,
  } = useFormBuilderStore();

  const event = events.find((e: any) => e.id === eventId) || selectedEvent;

  useEffect(() => {
    if (!eventId) return;

    // console.log("RegistrationFormBuilder: Loading event ID:", eventId);

    // Load the specific event data
    loadEvent(eventId);
    // Load form templates
    loadFormTemplates();
    // Try to load existing registration form
    loadRegistrationForm(eventId);
  }, [eventId]);

  // Debug logging
  const handleCreateForm = async () => {
    if (!eventId) return;

    const title = `${event?.title || "Event"} Registration Form`;
    const description = `Registration form for ${event?.title || "this event"}`;

    await createRegistrationForm(eventId, title, description);
  };

  const handleSaveForm = async () => {
    if (!eventId || !form) return;
    await saveRegistrationForm(eventId);
  };

  const handleDeleteForm = async () => {
    if (!eventId || !form) return;

    if (
      window.confirm(
        "Are you sure you want to delete this form? This action cannot be undone."
      )
    ) {
      await deleteRegistrationForm(eventId, form.id);
    }
  };

  const handleAddField = (
    type:
      | "text"
      | "email"
      | "phone"
      | "textarea"
      | "select"
      | "radio"
      | "checkbox"
      | "file"
      | "date"
      | "number"
      | "url"
  ) => {
    const fieldId = `field_${Date.now()}`;
    const newField = {
      id: fieldId,
      type,
      label: `New ${type} field`,
      required: false,
    };

    const stepIndex = isMultiStep && form?.steps ? currentStep : undefined;
    addField(newField, stepIndex);
    setActiveFieldId(fieldId);
  };

  const handleToggleMultiStep = () => {
    if (!form) return;

    if (!isMultiStep) {
      // Converting to multi-step
      const defaultStep = {
        title: "Step 1",
        description: "Please fill out the following information",
        fields: form.fields.map((f) => f.id),
      };
      addStep(defaultStep);
    } else {
      // Converting to single step - remove all steps
      if (form.steps) {
        for (let i = form.steps.length - 1; i >= 0; i--) {
          removeStep(i);
        }
      }
    }

    setIsMultiStep(!isMultiStep);
    setCurrentStep(0);
  };

  const handleAddStep = () => {
    const stepNumber = (form?.steps?.length || 0) + 1;
    const newStep = {
      title: `Step ${stepNumber}`,
      description: "Please fill out the following information",
      fields: [],
    };
    addStep(newStep);
  };

  const fieldTypes = [
    { type: "text", label: "Text Input", icon: FileText },
    { type: "email", label: "Email", icon: FileText },
    { type: "phone", label: "Phone", icon: FileText },
    { type: "textarea", label: "Text Area", icon: FileText },
    { type: "select", label: "Dropdown", icon: FileText },
    { type: "radio", label: "Radio Buttons", icon: FileText },
    { type: "checkbox", label: "Checkboxes", icon: FileText },
    { type: "file", label: "File Upload", icon: FileText },
    { type: "date", label: "Date Picker", icon: FileText },
    { type: "number", label: "Number", icon: FileText },
    { type: "url", label: "URL", icon: FileText },
  ] as const;

  if (isLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span>Loading form builder...</span>
        </div>
      </div>
    );
  }

  if (!event && !eventLoading && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Event not found
          </h1>
          <p className="text-gray-600 mb-4">
            Event ID: {eventId} | Events loaded: {events.length}
          </p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-blue-600 hover:text-blue-800"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/dashboard")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Registration Form Builder
                </h1>
                <p className="text-sm text-gray-600">{event?.title}</p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {!showPreview && (
                <>
                  <button
                    onClick={() => setShowTemplateModal(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Use Template
                  </button>
                  <button
                    onClick={handleToggleMultiStep}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      isMultiStep
                        ? "text-blue-700 bg-blue-100 border border-blue-300"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    <Layers className="h-4 w-4 inline mr-1" />
                    Multi-Step
                  </button>
                </>
              )}

              <button
                onClick={() => setShowPreview(!showPreview)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  showPreview
                    ? "text-blue-700 bg-blue-100 border border-blue-300"
                    : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Eye className="h-4 w-4 inline mr-1" />
                {showPreview ? "Edit" : "Preview"}
              </button>

              {form && (
                <>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    <Share2 className="h-4 w-4 inline mr-1" />
                    Share
                  </button>
                  <button
                    onClick={handleSaveForm}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 inline mr-1 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 inline mr-1" />
                        Save
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDeleteForm}
                    className="px-3 py-2 text-sm font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!form ? (
          // No form exists - show create form UI
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              No Registration Form
            </h2>
            <p className="text-gray-600 mb-6">
              Create a registration form for participants to register for your
              event.
            </p>
            <button
              onClick={handleCreateForm}
              disabled={isSaving}
              className="px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 inline mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 inline mr-2" />
                  Create Registration Form
                </>
              )}
            </button>
          </div>
        ) : showPreview ? (
          // Preview mode
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                {form.title}
              </h2>
              {form.description && (
                <p className="text-gray-600 mb-6">{form.description}</p>
              )}

              <div className="space-y-6">
                {form.fields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label}
                      {field.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                    </label>

                    {field.type === "textarea" ? (
                      <textarea
                        placeholder={field.placeholder}
                        className="w-full p-3 border border-gray-300 rounded-md"
                        rows={3}
                      />
                    ) : field.type === "select" ? (
                      <select className="w-full p-3 border border-gray-300 rounded-md">
                        <option value="">
                          {field.placeholder || "Select an option"}
                        </option>
                        {field.options?.map((option, idx) => (
                          <option key={idx} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    ) : field.type === "radio" && field.options ? (
                      <div className="space-y-2">
                        {field.options.map((option, idx) => (
                          <label key={idx} className="flex items-center">
                            <input
                              type="radio"
                              name={field.id}
                              value={option}
                              className="mr-2"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : field.type === "checkbox" && field.options ? (
                      <div className="space-y-2">
                        {field.options.map((option, idx) => (
                          <label key={idx} className="flex items-center">
                            <input
                              type="checkbox"
                              value={option}
                              className="mr-2"
                            />
                            <span className="text-sm">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={
                          field.type === "email"
                            ? "email"
                            : field.type === "number"
                            ? "number"
                            : field.type === "url"
                            ? "url"
                            : field.type === "date"
                            ? "date"
                            : "text"
                        }
                        placeholder={field.placeholder}
                        className="w-full p-3 border border-gray-300 rounded-md"
                      />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <button className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700">
                    Submit Registration
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Builder mode
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Field Types Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="font-medium text-gray-900 mb-2">Add Fields</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Click on any field type to add it to your form
                </p>
                <div className="space-y-2">
                  {fieldTypes.map(({ type, label, icon: Icon }) => (
                    <button
                      key={type}
                      onClick={() => handleAddField(type)}
                      className="w-full flex items-center space-x-3 p-3 text-left text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 rounded-md border border-transparent transition-all duration-200 group"
                      title={`Add ${label} field`}
                    >
                      <Icon className="h-4 w-4 group-hover:text-blue-600" />
                      <span className="font-medium">{label}</span>
                      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                        <Plus className="h-3 w-3 text-blue-600" />
                      </div>
                    </button>
                  ))}
                </div>

                {isMultiStep && (
                  <div className="mt-6 pt-6 border-t">
                    <h3 className="font-medium text-gray-900 mb-2">Steps</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Organize your form into multiple steps
                    </p>
                    <button
                      onClick={handleAddStep}
                      className="w-full flex items-center justify-center space-x-2 p-3 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md border border-blue-200 hover:border-blue-300 transition-all duration-200"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add New Step</span>
                    </button>
                  </div>
                )}

                {/* Quick Tips */}
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-800 mb-2 text-sm">
                    💡 Quick Tips
                  </h4>
                  <div className="space-y-2 text-xs text-gray-600">
                    <p>• Click on any field to edit its settings</p>
                    <p>• Use Preview to test your form</p>
                    <p>• Toggle Multi-Step for complex forms</p>
                    <p>• Use templates for quick setup</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Builder */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border">
                <div className="p-6 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-medium text-gray-900">
                        {form.title}
                      </h2>
                      {form.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {form.description}
                        </p>
                      )}
                    </div>
                    <button className="p-2 text-gray-400 hover:text-gray-600">
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>

                  {isMultiStep && form.steps && form.steps.length > 0 && (
                    <div className="mt-4 flex space-x-2">
                      {form.steps.map((step, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentStep(index)}
                          className={`px-3 py-2 text-sm rounded-md ${
                            currentStep === index
                              ? "bg-blue-100 text-blue-700 border border-blue-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200"
                          }`}
                        >
                          {step.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {form.fields.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Start Building Your Form
                      </h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Create a custom registration form by adding fields from
                        the sidebar, or get started quickly with a pre-built
                        template.
                      </p>
                      <div className="flex justify-center space-x-4">
                        <button
                          onClick={() => setShowTemplateModal(true)}
                          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Use Template
                        </button>
                        <button
                          onClick={() => handleAddField("text")}
                          className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Add First Field
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pl-8 relative">
                      {form.fields
                        .filter((field) => {
                          if (!isMultiStep || !form.steps) return true;
                          const currentStepData = form.steps[currentStep];
                          return currentStepData?.fields.includes(field.id);
                        })
                        .map((field, index) => (
                          <div key={field.id} className="group relative">
                            {/* Field number indicator */}
                            <div className="absolute -left-8 top-3 text-xs text-gray-400 font-medium bg-gray-100 rounded-full w-5 h-5 flex items-center justify-center">
                              {index + 1}
                            </div>

                            <div
                              className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                                activeFieldId === field.id
                                  ? "border-blue-500 bg-blue-50 shadow-sm"
                                  : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                              }`}
                              onClick={() => setActiveFieldId(field.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <label className="block text-sm font-medium text-gray-700">
                                      {field.label}
                                      {field.required && (
                                        <span className="text-red-500 ml-1">
                                          *
                                        </span>
                                      )}
                                    </label>
                                    <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded-full capitalize">
                                      {field.type}
                                    </span>
                                  </div>
                                  {field.placeholder && (
                                    <p className="text-xs text-gray-500 mt-1">
                                      Placeholder: {field.placeholder}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-1">
                                  {/* Move up button */}
                                  {index > 0 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reorderFields(index, index - 1);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                      title="Move up"
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                  )}

                                  {/* Move down button */}
                                  {index <
                                    form.fields.filter((f) => {
                                      if (!isMultiStep || !form.steps)
                                        return true;
                                      const currentStepData =
                                        form.steps[currentStep];
                                      return currentStepData?.fields.includes(
                                        f.id
                                      );
                                    }).length -
                                      1 && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        reorderFields(index, index + 1);
                                      }}
                                      className="p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                      title="Move down"
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  )}

                                  {/* Delete button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeField(field.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete field"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Field Preview */}
                              <div className="mt-3 opacity-80">
                                {field.type === "textarea" ? (
                                  <textarea
                                    placeholder={field.placeholder}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                                    rows={2}
                                    disabled
                                  />
                                ) : field.type === "select" ? (
                                  <select
                                    className="w-full p-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                                    disabled
                                  >
                                    <option>
                                      {field.placeholder || "Select an option"}
                                    </option>
                                    {field.options
                                      ?.slice(0, 3)
                                      .map((option, idx) => (
                                        <option key={idx}>{option}</option>
                                      ))}
                                    {field.options &&
                                      field.options.length > 3 && (
                                        <option>
                                          ... and {field.options.length - 3}{" "}
                                          more
                                        </option>
                                      )}
                                  </select>
                                ) : field.type === "radio" && field.options ? (
                                  <div className="space-y-1">
                                    {field.options
                                      .slice(0, 3)
                                      .map((option, idx) => (
                                        <label
                                          key={idx}
                                          className="flex items-center"
                                        >
                                          <input
                                            type="radio"
                                            className="mr-2"
                                            disabled
                                          />
                                          <span className="text-sm text-gray-600">
                                            {option}
                                          </span>
                                        </label>
                                      ))}
                                    {field.options.length > 3 && (
                                      <p className="text-xs text-gray-500 pl-5">
                                        ... and {field.options.length - 3} more
                                        options
                                      </p>
                                    )}
                                  </div>
                                ) : field.type === "checkbox" &&
                                  field.options ? (
                                  <div className="space-y-1">
                                    {field.options
                                      .slice(0, 3)
                                      .map((option, idx) => (
                                        <label
                                          key={idx}
                                          className="flex items-center"
                                        >
                                          <input
                                            type="checkbox"
                                            className="mr-2"
                                            disabled
                                          />
                                          <span className="text-sm text-gray-600">
                                            {option}
                                          </span>
                                        </label>
                                      ))}
                                    {field.options.length > 3 && (
                                      <p className="text-xs text-gray-500 pl-5">
                                        ... and {field.options.length - 3} more
                                        options
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <input
                                    type={
                                      field.type === "email"
                                        ? "email"
                                        : field.type === "number"
                                        ? "number"
                                        : field.type === "url"
                                        ? "url"
                                        : field.type === "date"
                                        ? "date"
                                        : "text"
                                    }
                                    placeholder={field.placeholder}
                                    className="w-full p-2 text-sm border border-gray-300 rounded-md bg-gray-50"
                                    disabled
                                  />
                                )}
                              </div>
                            </div>

                            {/* Quick add field below this one */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                              <div className="flex justify-center mt-2">
                                <button
                                  onClick={() => {
                                    // Add a new text field after this one
                                    const newField: FormField = {
                                      id: `field_${Date.now()}`,
                                      type: "text",
                                      label: "New Field",
                                      placeholder: "Enter value",
                                      required: false,
                                      options: [],
                                    };
                                    addField(newField);
                                    setActiveFieldId(newField.id);
                                  }}
                                  className="flex items-center gap-1 px-3 py-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full border border-blue-200 transition-colors"
                                >
                                  <Plus className="h-3 w-3" />
                                  Add Field Below
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Field Editor Sidebar */}
            <div className="lg:col-span-1">
              {activeFieldId &&
                (() => {
                  const activeField = form.fields.find(
                    (f) => f.id === activeFieldId
                  );
                  if (!activeField) return null;

                  return (
                    <div className="bg-white rounded-lg shadow-sm border p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="font-medium text-gray-900">
                          Edit Field
                        </h3>
                        <button
                          onClick={() => setActiveFieldId(null)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-4">
                        {/* Field Label */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Label
                          </label>
                          <input
                            type="text"
                            value={activeField.label}
                            onChange={(e) =>
                              updateField(activeFieldId, {
                                label: e.target.value,
                              })
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        {/* Field Placeholder */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={activeField.placeholder || ""}
                            onChange={(e) =>
                              updateField(activeFieldId, {
                                placeholder: e.target.value,
                              })
                            }
                            className="w-full p-2 border border-gray-300 rounded-md"
                          />
                        </div>

                        {/* Required toggle */}
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={activeField.required}
                            onChange={(e) =>
                              updateField(activeFieldId, {
                                required: e.target.checked,
                              })
                            }
                            className="mr-2"
                          />
                          <label className="text-sm font-medium text-gray-700">
                            Required field
                          </label>
                        </div>

                        {/* Options for select, radio, checkbox */}
                        {(activeField.type === "select" ||
                          activeField.type === "radio" ||
                          activeField.type === "checkbox") && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Options (one per line)
                            </label>
                            <textarea
                              value={(activeField.options || []).join("\n")}
                              onChange={(e) => {
                                const options = e.target.value
                                  .split("\n")
                                  .filter((opt) => opt.trim() !== "");
                                updateField(activeFieldId, { options });
                              }}
                              rows={4}
                              className="w-full p-2 border border-gray-300 rounded-md"
                              placeholder="Option 1&#10;Option 2&#10;Option 3"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showTemplateModal && (
        <FormTemplateModal
          templates={templates}
          onClose={() => setShowTemplateModal(false)}
          onSelect={(template: any) => {
            // Apply the template to the current form
            applyTemplate(template);
            setShowTemplateModal(false);

            // Show success message
            setShowSuccessMessage(
              `Template "${template.name}" applied successfully! You can now edit the fields.`
            );
            setTimeout(() => setShowSuccessMessage(null), 4000);
          }}
        />
      )}

      {form && showShareModal && (
        <ShareFormModal
          form={form}
          eventId={eventId!}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* Success Message */}
      {showSuccessMessage && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2 max-w-sm">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="text-sm font-medium">{showSuccessMessage}</p>
            <button
              onClick={() => setShowSuccessMessage(null)}
              className="flex-shrink-0 text-green-200 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
