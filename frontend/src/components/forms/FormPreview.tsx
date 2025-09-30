import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RegistrationForm, FormField } from "../../api/registrationForms";

interface FormPreviewProps {
  form: RegistrationForm;
}

export function FormPreview({ form }: FormPreviewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const renderField = (field: FormField) => {
    const value = formData[field.id] || "";

    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "url":
        return (
          <input
            type={
              field.type === "email"
                ? "email"
                : field.type === "url"
                ? "url"
                : "text"
            }
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            min={field.validation?.min}
            max={field.validation?.max}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => handleInputChange(field.id, e.target.value)}
            required={field.required}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">{field.placeholder || "Select an option"}</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-3">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <span className="ml-3 text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        if (field.options) {
          // Multiple checkboxes
          return (
            <div className="space-y-3">
              {field.options.map((option, index) => (
                <label key={index} className="flex items-center">
                  <input
                    type="checkbox"
                    value={option}
                    checked={
                      Array.isArray(value) ? value.includes(option) : false
                    }
                    onChange={(e) => {
                      const currentValue = Array.isArray(value) ? value : [];
                      if (e.target.checked) {
                        handleInputChange(field.id, [...currentValue, option]);
                      } else {
                        handleInputChange(
                          field.id,
                          currentValue.filter((v: string) => v !== option)
                        );
                      }
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-3 text-gray-700">{option}</span>
                </label>
              ))}
            </div>
          );
        } else {
          // Single checkbox
          return (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={value || false}
                onChange={(e) => handleInputChange(field.id, e.target.checked)}
                required={field.required}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-3 text-gray-700">{field.label}</span>
            </label>
          );
        }

      case "file":
        return (
          <input
            type="file"
            onChange={(e) => handleInputChange(field.id, e.target.files?.[0])}
            required={field.required}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      default:
        return null;
    }
  };

  const getCurrentStepFields = () => {
    if (!form.is_multi_step || !form.steps) {
      return form.fields;
    }

    const step = form.steps[currentStep];
    if (!step) return [];

    return form.fields.filter((field) => step.fields.includes(field.id));
  };

  const canGoNext = () => {
    if (!form.is_multi_step || !form.steps) return false;
    return currentStep < form.steps.length - 1;
  };

  const canGoPrevious = () => {
    if (!form.is_multi_step) return false;
    return currentStep > 0;
  };

  const currentStepData =
    form.is_multi_step && form.steps ? form.steps[currentStep] : null;
  const fieldsToShow = getCurrentStepFields();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border">
        {/* Form Header */}
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600">{form.description}</p>
          )}

          {/* Multi-step progress */}
          {form.is_multi_step && form.steps && form.steps.length > 1 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  Step {currentStep + 1} of {form.steps.length}
                </span>
                <span className="text-sm text-gray-600">
                  {Math.round(((currentStep + 1) / form.steps.length) * 100)}%
                  Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${((currentStep + 1) / form.steps.length) * 100}%`,
                  }}
                />
              </div>

              {currentStepData && (
                <div className="mt-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {currentStepData.title}
                  </h2>
                  {currentStepData.description && (
                    <p className="text-gray-600 mt-1">
                      {currentStepData.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Fields */}
        <div className="p-6">
          <div className="space-y-6">
            {fieldsToShow.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                {renderField(field)}
              </div>
            ))}
          </div>
        </div>

        {/* Form Navigation */}
        <div className="p-6 border-t bg-gray-50">
          {form.is_multi_step ? (
            <div className="flex justify-between">
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                disabled={!canGoPrevious()}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  canGoPrevious()
                    ? "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    : "text-gray-400 bg-gray-100 border border-gray-200 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="h-4 w-4 inline mr-1" />
                Previous
              </button>

              {canGoNext() ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4 inline ml-1" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
                >
                  Submit Registration
                </button>
              )}
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                type="submit"
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Submit Registration
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
