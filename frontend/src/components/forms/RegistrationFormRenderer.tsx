import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Form, FormField } from "../../api/forms";

interface RegistrationFormRendererProps {
  form: Form;
  onDataChange: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
}

export function RegistrationFormRenderer({
  form,
  onDataChange,
  initialData = {},
}: RegistrationFormRendererProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>(initialData);

  // Update parent component when form data changes
  useEffect(() => {
    onDataChange(formData);
  }, [formData, onDataChange]);

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
            <option value="">Select an option</option>
            {field.options?.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="radio"
                  name={field.id}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleInputChange(field.id, e.target.value)}
                  required={field.required}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "checkbox":
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <label key={option} className="flex items-center">
                <input
                  type="checkbox"
                  value={option}
                  checked={Array.isArray(value) && value.includes(option)}
                  onChange={(e) => {
                    const currentValues = Array.isArray(value) ? value : [];
                    if (e.target.checked) {
                      handleInputChange(field.id, [...currentValues, option]);
                    } else {
                      handleInputChange(
                        field.id,
                        currentValues.filter((v) => v !== option)
                      );
                    }
                  }}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        );

      case "file":
        return (
          <input
            type="file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              handleInputChange(field.id, file);
            }}
            required={field.required}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        );

      default:
        return null;
    }
  };

  const validateCurrentStep = () => {
    if (!form.is_multi_step || !form.steps) return true;

    const currentStepData = form.steps[currentStep];
    const stepFields = currentStepData.fields
      .map((fieldId) => form.fields.find((f) => f.id === fieldId))
      .filter((field): field is FormField => field !== undefined);

    return stepFields.every((field) => {
      if (!field.required) return true;
      const value = formData[field.id];
      if (field.type === "checkbox") {
        return Array.isArray(value) && value.length > 0;
      }
      return value !== undefined && value !== "" && value !== null;
    });
  };

  const canProceedToNext = () => {
    return validateCurrentStep();
  };

  const nextStep = () => {
    if (
      form.is_multi_step &&
      form.steps &&
      currentStep < form.steps.length - 1 &&
      canProceedToNext()
    ) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  if (form.is_multi_step && form.steps) {
    const currentStepData = form.steps[currentStep];
    const stepFields = currentStepData.fields
      .map((fieldId) => form.fields.find((f) => f.id === fieldId))
      .filter((field): field is FormField => field !== undefined);

    return (
      <div>
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-sm text-gray-600 mb-2">
            <span>
              Step {currentStep + 1} of {form.steps.length}
            </span>
            <span>
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
        </div>

        {/* Step Content */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            {currentStepData.title}
          </h2>
          {currentStepData.description && (
            <p className="text-gray-600 mb-4">{currentStepData.description}</p>
          )}

          <div className="space-y-4">
            {stepFields.map((field) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          {currentStep < form.steps.length - 1 ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={!canProceedToNext()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          ) : (
            <span className="text-sm text-gray-600">Ready to submit</span>
          )}
        </div>
      </div>
    );
  }

  // Single step form
  return (
    <div className="space-y-4">
      {form.fields.map((field) => (
        <div key={field.id}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          {renderField(field)}
        </div>
      ))}
    </div>
  );
}
