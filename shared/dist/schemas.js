import { z } from "zod";
// User schemas
export const UserSchema = z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["organizer", "participant", "admin"]),
    organizationName: z.string().optional(),
    phoneNumber: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const CreateUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
    role: z.enum(["organizer", "participant"]).default("participant"),
    organizationName: z.string().optional(),
    phoneNumber: z.string().optional(),
});
export const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});
// Event schemas
export const EventSchema = z.object({
    id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    location: z.string(),
    capacity: z.number().positive(),
    categoryId: z.string().uuid().optional(),
    bannerUrl: z.string().url().optional(),
    visibility: z.enum(["public", "private", "invite-only"]),
    organizerId: z.string().uuid(),
    registrationDeadline: z.date().optional(),
    isPaid: z.boolean().default(false),
    price: z.number().min(0).optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const CreateEventSchema = z.object({
    title: z.string().min(1),
    description: z.string(),
    startDate: z.string().transform((val) => new Date(val)),
    endDate: z.string().transform((val) => new Date(val)),
    location: z.string().min(1),
    capacity: z.number().positive(),
    categoryId: z.string().uuid().optional(),
    bannerUrl: z.string().url().optional(),
    visibility: z.enum(["public", "private", "invite-only"]),
    registrationDeadline: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    isPaid: z.boolean().default(false),
    price: z.number().min(0).optional(),
});
export const UpdateEventSchema = z.object({
    title: z.string().min(1).optional(),
    description: z.string().optional(),
    startDate: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    endDate: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    location: z.string().min(1).optional(),
    capacity: z.number().positive().optional(),
    categoryId: z.string().uuid().optional(),
    bannerUrl: z.string().url().optional(),
    visibility: z.enum(["public", "private", "invite-only"]).optional(),
    registrationDeadline: z
        .string()
        .transform((val) => new Date(val))
        .optional(),
    isPaid: z.boolean().optional(),
    price: z.number().min(0).optional(),
});
// Registration Form schemas
export const FormFieldSchema = z.object({
    id: z.string().uuid(),
    type: z.enum([
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
    ]),
    label: z.string().min(1),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    options: z.array(z.string()).optional(),
    validation: z
        .object({
        min: z.number().optional(),
        max: z.number().optional(),
        pattern: z.string().optional(),
    })
        .optional(),
    conditionalLogic: z
        .object({
        dependsOn: z.string().uuid(),
        condition: z.enum(["equals", "not_equals", "contains"]),
        value: z.string(),
    })
        .optional(),
});
export const RegistrationFormSchema = z.object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional(),
    fields: z.array(FormFieldSchema),
    isMultiStep: z.boolean().default(false),
    steps: z
        .array(z.object({
        title: z.string(),
        fields: z.array(z.string().uuid()),
    }))
        .optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
// Registration schemas
export const RegistrationSchema = z.object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    email: z.string().email(),
    name: z.string().min(1),
    responses: z.record(z.string(), z.any()),
    status: z.enum(["pending", "confirmed", "cancelled", "attended"]),
    qrCode: z.string(),
    paymentStatus: z.enum(["pending", "completed", "failed", "not_required"]).optional(),
    paymentId: z.string().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const CreateRegistrationSchema = z.object({
    eventId: z.string().uuid(),
    responses: z.record(z.string(), z.any()),
    email: z.string().email().optional(),
    name: z.string().min(1).optional(),
});
// Attendance schemas
export const AttendanceSchema = z.object({
    id: z.string().uuid(),
    registrationId: z.string().uuid(),
    eventId: z.string().uuid(),
    checkedInAt: z.date(),
    checkedInBy: z.string().uuid(),
    method: z.enum(["qr_code", "manual"]),
});
export const CheckInSchema = z.object({
    qrCode: z.string(),
    eventId: z.string().uuid(),
});
// Certificate schemas
export const CertificateTemplateSchema = z.object({
    id: z.string().uuid(),
    eventId: z.string().uuid(),
    name: z.string().min(1),
    template: z.object({
        background: z.string().optional(),
        elements: z.array(z.object({
            type: z.enum(["text", "image", "qr_code"]),
            content: z.string(),
            x: z.number(),
            y: z.number(),
            width: z.number().optional(),
            height: z.number().optional(),
            fontSize: z.number().optional(),
            fontFamily: z.string().optional(),
            color: z.string().optional(),
        })),
    }),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const CertificateSchema = z.object({
    id: z.string().uuid(),
    registrationId: z.string().uuid(),
    templateId: z.string().uuid(),
    certificateUrl: z.string().url(),
    verificationCode: z.string(),
    issuedAt: z.date(),
});
