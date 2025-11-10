import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import type { FormField } from "../../api/forms";

interface FormFieldEditorProps {
  field: FormField;
  onUpdate: (updates: Partial<FormField>) => void;
  onClose: () => void;
}

export function FormFieldEditor({
  field,
  onUpdate,
  onClose,
}: FormFieldEditorProps) {
  const [options, setOptions] = useState<string[]>(field.options || []);
  const [newOption, setNewOption] = useState("");

  const handleAddOption = () => {
    if (newOption.trim()) {
      const updatedOptions = [...options, newOption.trim()];
      setOptions(updatedOptions);
      onUpdate({ options: updatedOptions });
      setNewOption("");
    }
  };

  const handleRemoveOption = (index: number) => {
    const updatedOptions = options.filter((_, i) => i !== index);
    setOptions(updatedOptions);
    onUpdate({ options: updatedOptions });
  };

  const handleUpdateOption = (index: number, value: string) => {
    const updatedOptions = options.map((option, i) =>
      i === index ? value : option
    );
    setOptions(updatedOptions);
    onUpdate({ options: updatedOptions });
  };

  const needsOptions = ["select", "radio", "checkbox"].includes(field.type);

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Field Settings</h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Field Label */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Field Label
          </label>
          <input
            type="text"
            value={field.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Placeholder */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Placeholder
          </label>
          <input
            type="text"
            value={field.placeholder || ""}
            onChange={(e) => onUpdate({ placeholder: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Required */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="required"
            checked={field.required || false}
            onChange={(e) => onUpdate({ required: e.target.checked })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label
            htmlFor="required"
            className="ml-2 block text-sm text-gray-700"
          >
            Required field
          </label>
        </div>

        {/* Options for select, radio, checkbox */}
        {needsOptions && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Options
            </label>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                    className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    className="p-2 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={newOption}
                  onChange={(e) => setNewOption(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleAddOption()}
                  placeholder="Add new option"
                  className="flex-1 p-2 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  onClick={handleAddOption}
                  className="p-2 text-blue-600 hover:text-blue-800"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Validation Rules */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Validation
          </label>

          {field.type === "text" || field.type === "textarea" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Min Length
                </label>
                <input
                  type="number"
                  value={field.validation?.min || ""}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        min: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Max Length
                </label>
                <input
                  type="number"
                  value={field.validation?.max || ""}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        max: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>
          ) : field.type === "number" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Min Value
                </label>
                <input
                  type="number"
                  value={field.validation?.min || ""}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        min: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Max Value
                </label>
                <input
                  type="number"
                  value={field.validation?.max || ""}
                  onChange={(e) =>
                    onUpdate({
                      validation: {
                        ...field.validation,
                        max: e.target.value
                          ? parseInt(e.target.value)
                          : undefined,
                      },
                    })
                  }
                  className="w-full p-2 text-sm border border-gray-300 rounded-md"
                />
              </div>
            </div>
          ) : null}

          <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">
              Custom Pattern (Regex)
            </label>
            <input
              type="text"
              value={field.validation?.pattern || ""}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    pattern: e.target.value,
                  },
                })
              }
              placeholder="e.g., ^[A-Z].*"
              className="w-full p-2 text-sm border border-gray-300 rounded-md"
            />
          </div>

          <div className="mt-2">
            <label className="block text-xs text-gray-600 mb-1">
              Validation Message
            </label>
            <input
              type="text"
              value={field.validation?.message || ""}
              onChange={(e) =>
                onUpdate({
                  validation: {
                    ...field.validation,
                    message: e.target.value,
                  },
                })
              }
              placeholder="Error message for invalid input"
              className="w-full p-2 text-sm border border-gray-300 rounded-md"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
