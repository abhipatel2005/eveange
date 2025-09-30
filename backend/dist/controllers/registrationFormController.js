import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
// Field types supported in registration forms
const FieldTypeEnum = z.enum([
    "text",
    "email",
    "phone",
    "textarea",
    "select",
    "radio",
    "checkbox",
    "file",
    "date",
    "number",
    "url",
]);
// Form field schema
const FormFieldSchema = z.object({
    id: z.string(),
    type: FieldTypeEnum,
    label: z.string(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(), // For select, radio, checkbox
    validation: z
        .object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
        message: z.string().optional(),
    })
        .optional(),
});
// Registration form schema
const CreateRegistrationFormSchema = z.object({
    title: z.string().min(1, "Form title is required"),
    description: z.string().optional(),
    fields: z.array(FormFieldSchema),
    is_multi_step: z.boolean().default(false),
    steps: z
        .array(z.object({
        title: z.string(),
        description: z.string().optional(),
        fields: z.array(z.string()), // Field IDs for this step
    }))
        .optional(),
});
const UpdateRegistrationFormSchema = CreateRegistrationFormSchema.partial();
export class RegistrationFormController {
    // Create a registration form for an event
    static async createRegistrationForm(req, res) {
        try {
            const userId = req.user?.id;
            const { eventId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            // Verify the event exists and user is the organizer
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("id, title, organizer_id")
                .eq("id", eventId)
                .eq("organizer_id", userId)
                .single();
            if (eventError || !event) {
                res.status(404).json({
                    success: false,
                    error: "Event not found or you don't have permission to modify it",
                });
                return;
            }
            // Validate form data
            const validatedData = CreateRegistrationFormSchema.parse(req.body);
            // Create the registration form
            const { data: form, error: formError } = await supabase
                .from("registration_forms")
                .insert({
                event_id: eventId,
                title: validatedData.title,
                description: validatedData.description || null,
                fields: validatedData.fields,
                is_multi_step: validatedData.is_multi_step,
                steps: validatedData.steps || null,
            })
                .select("*")
                .single();
            if (formError) {
                console.error("Registration form creation error:", formError);
                res.status(500).json({
                    success: false,
                    error: "Failed to create registration form",
                });
                return;
            }
            res.status(201).json({
                success: true,
                message: "Registration form created successfully",
                data: { form },
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: "Invalid form data",
                    details: error.errors,
                });
                return;
            }
            console.error("Create registration form error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get registration form for an event
    static async getRegistrationForm(req, res) {
        try {
            const { eventId } = req.params;
            // Get the registration form for this event
            const { data: form, error } = await supabase
                .from("registration_forms")
                .select(`
          id, title, description, fields, is_multi_step, steps, 
          created_at, updated_at,
          event:event_id(id, title, organizer_id)
        `)
                .eq("event_id", eventId)
                .single();
            if (error || !form) {
                res.status(404).json({
                    success: false,
                    error: "Registration form not found for this event",
                });
                return;
            }
            res.json({
                success: true,
                data: { form },
            });
        }
        catch (error) {
            console.error("Get registration form error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Update registration form
    static async updateRegistrationForm(req, res) {
        try {
            const userId = req.user?.id;
            const { eventId, formId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            // Verify the form exists and user has permission
            const { data: form, error: formError } = await supabase
                .from("registration_forms")
                .select(`
          id, event_id,
          event:event_id(organizer_id)
        `)
                .eq("id", formId)
                .eq("event_id", eventId)
                .single();
            if (formError || !form) {
                res.status(404).json({
                    success: false,
                    error: "Registration form not found",
                });
                return;
            }
            const eventData = Array.isArray(form.event) ? form.event[0] : form.event;
            if (eventData.organizer_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: "You don't have permission to modify this form",
                });
                return;
            }
            // Validate update data
            const validatedData = UpdateRegistrationFormSchema.parse(req.body);
            // Update the form
            const { data: updatedForm, error: updateError } = await supabase
                .from("registration_forms")
                .update({
                ...(validatedData.title && { title: validatedData.title }),
                ...(validatedData.description !== undefined && {
                    description: validatedData.description,
                }),
                ...(validatedData.fields && { fields: validatedData.fields }),
                ...(validatedData.is_multi_step !== undefined && {
                    is_multi_step: validatedData.is_multi_step,
                }),
                ...(validatedData.steps !== undefined && {
                    steps: validatedData.steps,
                }),
                updated_at: new Date().toISOString(),
            })
                .eq("id", formId)
                .select("*")
                .single();
            if (updateError) {
                console.error("Registration form update error:", updateError);
                res.status(500).json({
                    success: false,
                    error: "Failed to update registration form",
                });
                return;
            }
            res.json({
                success: true,
                message: "Registration form updated successfully",
                data: { form: updatedForm },
            });
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                res.status(400).json({
                    success: false,
                    error: "Invalid form data",
                    details: error.errors,
                });
                return;
            }
            console.error("Update registration form error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Delete registration form
    static async deleteRegistrationForm(req, res) {
        try {
            const userId = req.user?.id;
            const { eventId, formId } = req.params;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            // Verify the form exists and user has permission
            const { data: form, error: formError } = await supabase
                .from("registration_forms")
                .select(`
          id, event_id,
          event:event_id(organizer_id)
        `)
                .eq("id", formId)
                .eq("event_id", eventId)
                .single();
            if (formError || !form) {
                res.status(404).json({
                    success: false,
                    error: "Registration form not found",
                });
                return;
            }
            const eventData = Array.isArray(form.event) ? form.event[0] : form.event;
            if (eventData.organizer_id !== userId) {
                res.status(403).json({
                    success: false,
                    error: "You don't have permission to delete this form",
                });
                return;
            }
            // Delete the form
            const { error: deleteError } = await supabase
                .from("registration_forms")
                .delete()
                .eq("id", formId);
            if (deleteError) {
                console.error("Registration form deletion error:", deleteError);
                res.status(500).json({
                    success: false,
                    error: "Failed to delete registration form",
                });
                return;
            }
            res.json({
                success: true,
                message: "Registration form deleted successfully",
            });
        }
        catch (error) {
            console.error("Delete registration form error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get form template for quick setup
    static async getFormTemplates(req, res) {
        try {
            const templates = [
                {
                    id: "basic",
                    name: "Basic Registration",
                    description: "Simple form with essential fields",
                    fields: [
                        {
                            id: "name",
                            type: "text",
                            label: "Full Name",
                            required: true,
                        },
                        {
                            id: "email",
                            type: "email",
                            label: "Email Address",
                            required: true,
                        },
                        {
                            id: "phone",
                            type: "phone",
                            label: "Phone Number",
                            required: false,
                        },
                    ],
                },
                {
                    id: "detailed",
                    name: "Detailed Registration",
                    description: "Comprehensive form with additional details",
                    fields: [
                        {
                            id: "name",
                            type: "text",
                            label: "Full Name",
                            required: true,
                        },
                        {
                            id: "email",
                            type: "email",
                            label: "Email Address",
                            required: true,
                        },
                        {
                            id: "phone",
                            type: "phone",
                            label: "Phone Number",
                            required: true,
                        },
                        {
                            id: "organization",
                            type: "text",
                            label: "Organization/Company",
                            required: false,
                        },
                        {
                            id: "dietary_requirements",
                            type: "select",
                            label: "Dietary Requirements",
                            required: false,
                            options: ["None", "Vegetarian", "Vegan", "Gluten-free", "Other"],
                        },
                        {
                            id: "emergency_contact",
                            type: "text",
                            label: "Emergency Contact Name",
                            required: false,
                        },
                        {
                            id: "emergency_phone",
                            type: "phone",
                            label: "Emergency Contact Phone",
                            required: false,
                        },
                        {
                            id: "comments",
                            type: "textarea",
                            label: "Additional Comments",
                            required: false,
                        },
                    ],
                },
                {
                    id: "conference",
                    name: "Conference Registration",
                    description: "Tailored for conference attendees",
                    fields: [
                        {
                            id: "name",
                            type: "text",
                            label: "Full Name",
                            required: true,
                        },
                        {
                            id: "email",
                            type: "email",
                            label: "Email Address",
                            required: true,
                        },
                        {
                            id: "job_title",
                            type: "text",
                            label: "Job Title",
                            required: false,
                        },
                        {
                            id: "company",
                            type: "text",
                            label: "Company",
                            required: false,
                        },
                        {
                            id: "experience_level",
                            type: "radio",
                            label: "Experience Level",
                            required: true,
                            options: ["Beginner", "Intermediate", "Advanced", "Expert"],
                        },
                        {
                            id: "sessions_interest",
                            type: "checkbox",
                            label: "Sessions of Interest",
                            required: false,
                            options: [
                                "Technical Sessions",
                                "Workshops",
                                "Networking",
                                "Keynote Speeches",
                            ],
                        },
                    ],
                },
            ];
            res.json({
                success: true,
                data: { templates },
            });
        }
        catch (error) {
            console.error("Get form templates error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
}
