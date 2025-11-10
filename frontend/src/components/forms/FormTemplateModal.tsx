import { X, FileText, Users, Briefcase } from "lucide-react";
import type { FormTemplate } from "../../api/forms";

interface FormTemplateModalProps {
  templates: FormTemplate[];
  onClose: () => void;
  onSelect: (template: FormTemplate) => void;
}

export function FormTemplateModal({
  templates,
  onClose,
  onSelect,
}: FormTemplateModalProps) {
  const getTemplateIcon = (templateId: string) => {
    switch (templateId) {
      case "basic":
        return FileText;
      case "detailed":
        return Users;
      case "conference":
        return Briefcase;
      default:
        return FileText;
    }
  };

  const getTemplateColor = (templateId: string) => {
    switch (templateId) {
      case "basic":
        return "text-blue-600";
      case "detailed":
        return "text-green-600";
      case "conference":
        return "text-purple-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Choose a Template
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-gray-600 mt-1">
            Start with a pre-built template and customize it to fit your event's
            needs. All templates can be fully edited after selection.
          </p>
        </div>

        {/* Templates Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const Icon = getTemplateIcon(template.id);
              const iconColor = getTemplateColor(template.id);

              return (
                <div
                  key={template.id}
                  className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => onSelect(template)}
                >
                  <div className="flex items-center mb-4">
                    <div className={`p-2 rounded-md bg-gray-100`}>
                      <Icon className={`h-6 w-6 ${iconColor}`} />
                    </div>
                    <div className="ml-3">
                      <h3 className="font-medium text-gray-900">
                        {template.name}
                      </h3>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-4">
                    {template.description}
                  </p>

                  {/* Field Preview */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Includes {template.fields.length} fields:
                    </p>
                    <div className="space-y-1">
                      {template.fields.slice(0, 4).map((field, index) => (
                        <div
                          key={index}
                          className="text-xs text-gray-600 flex items-center"
                        >
                          <div className="w-2 h-2 bg-gray-300 rounded-full mr-2" />
                          {field.label}
                        </div>
                      ))}
                      {template.fields.length > 4 && (
                        <div className="text-xs text-gray-500 pl-4">
                          +{template.fields.length - 4} more fields
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => onSelect(template)}
                      className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Use This Template
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {templates.length === 0 && (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No templates available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              You can customize any template after selection
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
