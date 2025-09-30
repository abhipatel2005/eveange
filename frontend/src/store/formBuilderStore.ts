import { create } from "zustand";
import {
  RegistrationFormService,
  type RegistrationForm,
  type FormField,
  type FormTemplate,
  type FormStep,
} from "../api/registrationForms";

interface FormBuilderState {
  // Form data
  form: RegistrationForm | null;
  templates: FormTemplate[];

  // Builder state
  activeFieldId: string | null;
  isMultiStep: boolean;
  currentStep: number;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  setForm: (form: RegistrationForm | null) => void;
  setTemplates: (templates: FormTemplate[]) => void;
  setActiveFieldId: (fieldId: string | null) => void;
  setIsMultiStep: (isMultiStep: boolean) => void;
  setCurrentStep: (step: number) => void;

  // Field management
  addField: (field: FormField, stepIndex?: number) => void;
  updateField: (fieldId: string, updates: Partial<FormField>) => void;
  removeField: (fieldId: string) => void;
  reorderFields: (fromIndex: number, toIndex: number) => void;

  // Step management
  addStep: (step: FormStep) => void;
  updateStep: (stepIndex: number, updates: Partial<FormStep>) => void;
  removeStep: (stepIndex: number) => void;
  reorderSteps: (fromIndex: number, toIndex: number) => void;

  // Template management
  applyTemplate: (template: FormTemplate) => void;

  // API actions
  loadFormTemplates: () => Promise<void>;
  loadRegistrationForm: (eventId: string) => Promise<void>;
  saveRegistrationForm: (eventId: string) => Promise<void>;
  createRegistrationForm: (
    eventId: string,
    title: string,
    description?: string
  ) => Promise<void>;
  deleteRegistrationForm: (eventId: string, formId: string) => Promise<void>;
}

export const useFormBuilderStore = create<FormBuilderState>((set, get) => ({
  // Initial state
  form: null,
  templates: [],
  activeFieldId: null,
  isMultiStep: false,
  currentStep: 0,
  isLoading: false,
  isSaving: false,

  // Basic setters
  setForm: (form) => set({ form }),
  setTemplates: (templates) => set({ templates }),
  setActiveFieldId: (activeFieldId) => set({ activeFieldId }),
  setIsMultiStep: (isMultiStep) => set({ isMultiStep }),
  setCurrentStep: (currentStep) => set({ currentStep }),

  // Field management
  addField: (field, stepIndex) => {
    const { form, isMultiStep } = get();
    if (!form) return;

    const updatedFields = [...form.fields, field];
    let updatedSteps = form.steps || [];

    if (
      isMultiStep &&
      typeof stepIndex === "number" &&
      updatedSteps[stepIndex]
    ) {
      updatedSteps = updatedSteps.map((step, index) =>
        index === stepIndex
          ? { ...step, fields: [...step.fields, field.id] }
          : step
      );
    }

    set({
      form: {
        ...form,
        fields: updatedFields,
        steps: updatedSteps.length > 0 ? updatedSteps : undefined,
      },
    });
  },

  updateField: (fieldId, updates) => {
    const { form } = get();
    if (!form) return;

    const updatedFields = form.fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    set({
      form: { ...form, fields: updatedFields },
    });
  },

  removeField: (fieldId) => {
    const { form } = get();
    if (!form) return;

    const updatedFields = form.fields.filter((field) => field.id !== fieldId);
    let updatedSteps = form.steps || [];

    if (updatedSteps.length > 0) {
      updatedSteps = updatedSteps.map((step) => ({
        ...step,
        fields: step.fields.filter((id) => id !== fieldId),
      }));
    }

    set({
      form: {
        ...form,
        fields: updatedFields,
        steps: updatedSteps.length > 0 ? updatedSteps : undefined,
      },
      activeFieldId: null,
    });
  },

  reorderFields: (fromIndex, toIndex) => {
    const { form } = get();
    if (!form) return;

    const updatedFields = [...form.fields];
    const [removed] = updatedFields.splice(fromIndex, 1);
    updatedFields.splice(toIndex, 0, removed);

    set({
      form: { ...form, fields: updatedFields },
    });
  },

  // Step management
  addStep: (step) => {
    const { form } = get();
    if (!form) return;

    const updatedSteps = [...(form.steps || []), step];

    set({
      form: {
        ...form,
        is_multi_step: true,
        steps: updatedSteps,
      },
      isMultiStep: true,
    });
  },

  updateStep: (stepIndex, updates) => {
    const { form } = get();
    if (!form || !form.steps) return;

    const updatedSteps = form.steps.map((step, index) =>
      index === stepIndex ? { ...step, ...updates } : step
    );

    set({
      form: { ...form, steps: updatedSteps },
    });
  },

  removeStep: (stepIndex) => {
    const { form } = get();
    if (!form || !form.steps) return;

    const updatedSteps = form.steps.filter((_, index) => index !== stepIndex);

    set({
      form: {
        ...form,
        steps: updatedSteps.length > 0 ? updatedSteps : undefined,
        is_multi_step: updatedSteps.length > 0,
      },
      isMultiStep: updatedSteps.length > 0,
      currentStep: Math.min(get().currentStep, updatedSteps.length - 1),
    });
  },

  reorderSteps: (fromIndex, toIndex) => {
    const { form } = get();
    if (!form || !form.steps) return;

    const updatedSteps = [...form.steps];
    const [removed] = updatedSteps.splice(fromIndex, 1);
    updatedSteps.splice(toIndex, 0, removed);

    set({
      form: { ...form, steps: updatedSteps },
    });
  },

  // Template management
  applyTemplate: (template) => {
    const { form } = get();
    if (!form) return;

    // Apply template fields to the current form
    const updatedForm = {
      ...form,
      fields: [...template.fields], // Use template fields
      is_multi_step: false, // Reset to single step initially
      steps: undefined, // Clear existing steps
    };

    set({
      form: updatedForm,
      isMultiStep: false,
      currentStep: 0,
      activeFieldId: null, // Clear active field selection
    });
  },

  // API actions
  loadFormTemplates: async () => {
    try {
      set({ isLoading: true });
      const response = await RegistrationFormService.getFormTemplates();

      if (response.success && response.data) {
        set({ templates: response.data.templates });
      } else {
        console.error("Failed to load form templates:", response.error);
      }
    } catch (error) {
      console.error("Error loading form templates:", error);
    } finally {
      set({ isLoading: false });
    }
  },

  loadRegistrationForm: async (eventId: string) => {
    try {
      set({ isLoading: true });
      const response = await RegistrationFormService.getRegistrationForm(
        eventId
      );

      if (response.success && response.data) {
        const form = response.data.form;
        set({
          form,
          isMultiStep: form.is_multi_step,
          currentStep: 0,
        });
      } else {
        console.error("Failed to load registration form:", response.error);
        set({ form: null });
      }
    } catch (error) {
      console.error("Error loading registration form:", error);
      set({ form: null });
    } finally {
      set({ isLoading: false });
    }
  },

  saveRegistrationForm: async (eventId: string) => {
    const { form } = get();
    if (!form) return;

    try {
      set({ isSaving: true });
      const response = await RegistrationFormService.updateRegistrationForm(
        eventId,
        form.id,
        {
          title: form.title,
          description: form.description,
          fields: form.fields,
          is_multi_step: form.is_multi_step,
          steps: form.steps,
        }
      );

      if (response.success && response.data) {
        set({ form: response.data.form });
      } else {
        console.error("Failed to save registration form:", response.error);
      }
    } catch (error) {
      console.error("Error saving registration form:", error);
    } finally {
      set({ isSaving: false });
    }
  },

  createRegistrationForm: async (
    eventId: string,
    title: string,
    description?: string
  ) => {
    try {
      set({ isSaving: true });
      const response = await RegistrationFormService.createRegistrationForm(
        eventId,
        {
          title,
          description,
          fields: [],
          is_multi_step: false,
        }
      );

      if (response.success && response.data) {
        set({
          form: response.data.form,
          isMultiStep: response.data.form.is_multi_step,
          currentStep: 0,
        });
      } else {
        console.error("Failed to create registration form:", response.error);
      }
    } catch (error) {
      console.error("Error creating registration form:", error);
    } finally {
      set({ isSaving: false });
    }
  },

  deleteRegistrationForm: async (eventId: string, formId: string) => {
    try {
      set({ isLoading: true });
      const response = await RegistrationFormService.deleteRegistrationForm(
        eventId,
        formId
      );

      if (response.success) {
        set({
          form: null,
          activeFieldId: null,
          isMultiStep: false,
          currentStep: 0,
        });
      } else {
        console.error("Failed to delete registration form:", response.error);
      }
    } catch (error) {
      console.error("Error deleting registration form:", error);
    } finally {
      set({ isLoading: false });
    }
  },
}));
