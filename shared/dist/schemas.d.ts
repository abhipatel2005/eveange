import { z } from "zod";
export declare const UserSchema: z.ZodObject<{
    id: z.ZodString;
    email: z.ZodString;
    name: z.ZodString;
    role: z.ZodEnum<["organizer", "participant", "admin"]>;
    organizationName: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string;
    role: "organizer" | "participant" | "admin";
    createdAt: Date;
    updatedAt: Date;
    organizationName?: string | undefined;
    phoneNumber?: string | undefined;
}, {
    id: string;
    email: string;
    name: string;
    role: "organizer" | "participant" | "admin";
    createdAt: Date;
    updatedAt: Date;
    organizationName?: string | undefined;
    phoneNumber?: string | undefined;
}>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodString;
    role: z.ZodDefault<z.ZodEnum<["participant"]>>;
    organizationName: z.ZodOptional<z.ZodString>;
    phoneNumber: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    name: string;
    role: "participant";
    password: string;
    organizationName?: string | undefined;
    phoneNumber?: string | undefined;
}, {
    email: string;
    name: string;
    password: string;
    role?: "participant" | undefined;
    organizationName?: string | undefined;
    phoneNumber?: string | undefined;
}>;
export declare const OrganizerUpgradeSchema: z.ZodObject<{
    organizationName: z.ZodString;
    phoneNumber: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    organizationName: string;
    phoneNumber?: string | undefined;
    description?: string | undefined;
}, {
    organizationName: string;
    phoneNumber?: string | undefined;
    description?: string | undefined;
}>;
export declare const LoginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const EventSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    startDate: z.ZodDate;
    endDate: z.ZodDate;
    location: z.ZodString;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    capacity: z.ZodNumber;
    categoryId: z.ZodOptional<z.ZodString>;
    bannerUrl: z.ZodOptional<z.ZodString>;
    visibility: z.ZodEnum<["public", "private", "invite-only"]>;
    organizerId: z.ZodString;
    registrationDeadline: z.ZodOptional<z.ZodDate>;
    isPaid: z.ZodDefault<z.ZodBoolean>;
    price: z.ZodOptional<z.ZodNumber>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    title: string;
    startDate: Date;
    endDate: Date;
    location: string;
    capacity: number;
    visibility: "public" | "private" | "invite-only";
    organizerId: string;
    isPaid: boolean;
    latitude?: number | undefined;
    longitude?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    registrationDeadline?: Date | undefined;
    price?: number | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    description: string;
    title: string;
    startDate: Date;
    endDate: Date;
    location: string;
    capacity: number;
    visibility: "public" | "private" | "invite-only";
    organizerId: string;
    latitude?: number | undefined;
    longitude?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    registrationDeadline?: Date | undefined;
    isPaid?: boolean | undefined;
    price?: number | undefined;
}>;
export declare const CreateEventSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodString;
    startDate: z.ZodEffects<z.ZodString, Date, string>;
    endDate: z.ZodEffects<z.ZodString, Date, string>;
    location: z.ZodString;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    capacity: z.ZodNumber;
    categoryId: z.ZodOptional<z.ZodString>;
    bannerUrl: z.ZodOptional<z.ZodString>;
    visibility: z.ZodEnum<["public", "private", "invite-only"]>;
    registrationDeadline: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    isPaid: z.ZodDefault<z.ZodBoolean>;
    price: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    startDate: Date;
    endDate: Date;
    location: string;
    capacity: number;
    visibility: "public" | "private" | "invite-only";
    isPaid: boolean;
    latitude?: number | undefined;
    longitude?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    registrationDeadline?: Date | undefined;
    price?: number | undefined;
}, {
    description: string;
    title: string;
    startDate: string;
    endDate: string;
    location: string;
    capacity: number;
    visibility: "public" | "private" | "invite-only";
    latitude?: number | undefined;
    longitude?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    registrationDeadline?: string | undefined;
    isPaid?: boolean | undefined;
    price?: number | undefined;
}>;
export declare const UpdateEventSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodString>;
    startDate: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    endDate: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    location: z.ZodOptional<z.ZodString>;
    latitude: z.ZodOptional<z.ZodNumber>;
    longitude: z.ZodOptional<z.ZodNumber>;
    capacity: z.ZodOptional<z.ZodNumber>;
    categoryId: z.ZodOptional<z.ZodString>;
    bannerUrl: z.ZodOptional<z.ZodString>;
    visibility: z.ZodOptional<z.ZodEnum<["public", "private", "invite-only"]>>;
    registrationDeadline: z.ZodOptional<z.ZodEffects<z.ZodString, Date, string>>;
    isPaid: z.ZodOptional<z.ZodBoolean>;
    price: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    description?: string | undefined;
    title?: string | undefined;
    startDate?: Date | undefined;
    endDate?: Date | undefined;
    location?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacity?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    visibility?: "public" | "private" | "invite-only" | undefined;
    registrationDeadline?: Date | undefined;
    isPaid?: boolean | undefined;
    price?: number | undefined;
}, {
    description?: string | undefined;
    title?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    location?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    capacity?: number | undefined;
    categoryId?: string | undefined;
    bannerUrl?: string | undefined;
    visibility?: "public" | "private" | "invite-only" | undefined;
    registrationDeadline?: string | undefined;
    isPaid?: boolean | undefined;
    price?: number | undefined;
}>;
export declare const FormFieldSchema: z.ZodObject<{
    id: z.ZodString;
    type: z.ZodEnum<["text", "email", "phone", "textarea", "select", "radio", "checkbox", "file", "date", "number", "url"]>;
    label: z.ZodString;
    placeholder: z.ZodOptional<z.ZodString>;
    required: z.ZodDefault<z.ZodBoolean>;
    options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    validation: z.ZodOptional<z.ZodObject<{
        min: z.ZodOptional<z.ZodNumber>;
        max: z.ZodOptional<z.ZodNumber>;
        pattern: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        min?: number | undefined;
        max?: number | undefined;
        pattern?: string | undefined;
    }, {
        min?: number | undefined;
        max?: number | undefined;
        pattern?: string | undefined;
    }>>;
    conditionalLogic: z.ZodOptional<z.ZodObject<{
        dependsOn: z.ZodString;
        condition: z.ZodEnum<["equals", "not_equals", "contains"]>;
        value: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        value: string;
        dependsOn: string;
        condition: "equals" | "not_equals" | "contains";
    }, {
        value: string;
        dependsOn: string;
        condition: "equals" | "not_equals" | "contains";
    }>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
    label: string;
    required: boolean;
    options?: string[] | undefined;
    validation?: {
        min?: number | undefined;
        max?: number | undefined;
        pattern?: string | undefined;
    } | undefined;
    placeholder?: string | undefined;
    conditionalLogic?: {
        value: string;
        dependsOn: string;
        condition: "equals" | "not_equals" | "contains";
    } | undefined;
}, {
    id: string;
    type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
    label: string;
    options?: string[] | undefined;
    validation?: {
        min?: number | undefined;
        max?: number | undefined;
        pattern?: string | undefined;
    } | undefined;
    placeholder?: string | undefined;
    required?: boolean | undefined;
    conditionalLogic?: {
        value: string;
        dependsOn: string;
        condition: "equals" | "not_equals" | "contains";
    } | undefined;
}>;
export declare const RegistrationFormSchema: z.ZodObject<{
    id: z.ZodString;
    eventId: z.ZodString;
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    fields: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        type: z.ZodEnum<["text", "email", "phone", "textarea", "select", "radio", "checkbox", "file", "date", "number", "url"]>;
        label: z.ZodString;
        placeholder: z.ZodOptional<z.ZodString>;
        required: z.ZodDefault<z.ZodBoolean>;
        options: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        validation: z.ZodOptional<z.ZodObject<{
            min: z.ZodOptional<z.ZodNumber>;
            max: z.ZodOptional<z.ZodNumber>;
            pattern: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        }, {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        }>>;
        conditionalLogic: z.ZodOptional<z.ZodObject<{
            dependsOn: z.ZodString;
            condition: z.ZodEnum<["equals", "not_equals", "contains"]>;
            value: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        }, {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        }>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
        label: string;
        required: boolean;
        options?: string[] | undefined;
        validation?: {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        } | undefined;
        placeholder?: string | undefined;
        conditionalLogic?: {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        } | undefined;
    }, {
        id: string;
        type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
        label: string;
        options?: string[] | undefined;
        validation?: {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        } | undefined;
        placeholder?: string | undefined;
        required?: boolean | undefined;
        conditionalLogic?: {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        } | undefined;
    }>, "many">;
    isMultiStep: z.ZodDefault<z.ZodBoolean>;
    steps: z.ZodOptional<z.ZodArray<z.ZodObject<{
        title: z.ZodString;
        fields: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        title: string;
        fields: string[];
    }, {
        title: string;
        fields: string[];
    }>, "many">>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    eventId: string;
    fields: {
        id: string;
        type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
        label: string;
        required: boolean;
        options?: string[] | undefined;
        validation?: {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        } | undefined;
        placeholder?: string | undefined;
        conditionalLogic?: {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        } | undefined;
    }[];
    isMultiStep: boolean;
    description?: string | undefined;
    steps?: {
        title: string;
        fields: string[];
    }[] | undefined;
}, {
    id: string;
    createdAt: Date;
    updatedAt: Date;
    title: string;
    eventId: string;
    fields: {
        id: string;
        type: "number" | "email" | "date" | "text" | "phone" | "textarea" | "select" | "radio" | "checkbox" | "file" | "url";
        label: string;
        options?: string[] | undefined;
        validation?: {
            min?: number | undefined;
            max?: number | undefined;
            pattern?: string | undefined;
        } | undefined;
        placeholder?: string | undefined;
        required?: boolean | undefined;
        conditionalLogic?: {
            value: string;
            dependsOn: string;
            condition: "equals" | "not_equals" | "contains";
        } | undefined;
    }[];
    description?: string | undefined;
    isMultiStep?: boolean | undefined;
    steps?: {
        title: string;
        fields: string[];
    }[] | undefined;
}>;
export declare const RegistrationSchema: z.ZodObject<{
    id: z.ZodString;
    eventId: z.ZodString;
    userId: z.ZodOptional<z.ZodString>;
    email: z.ZodString;
    name: z.ZodString;
    responses: z.ZodRecord<z.ZodString, z.ZodAny>;
    status: z.ZodEnum<["pending", "confirmed", "cancelled", "attended"]>;
    qrCode: z.ZodString;
    paymentStatus: z.ZodOptional<z.ZodNullable<z.ZodEnum<["pending", "completed", "failed", "refunded"]>>>;
    paymentId: z.ZodOptional<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    email: string;
    name: string;
    status: "pending" | "confirmed" | "cancelled" | "attended";
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    responses: Record<string, any>;
    qrCode: string;
    userId?: string | undefined;
    paymentStatus?: "pending" | "completed" | "failed" | "refunded" | null | undefined;
    paymentId?: string | undefined;
}, {
    id: string;
    email: string;
    name: string;
    status: "pending" | "confirmed" | "cancelled" | "attended";
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    responses: Record<string, any>;
    qrCode: string;
    userId?: string | undefined;
    paymentStatus?: "pending" | "completed" | "failed" | "refunded" | null | undefined;
    paymentId?: string | undefined;
}>;
export declare const CreateRegistrationSchema: z.ZodObject<{
    eventId: z.ZodString;
    responses: z.ZodRecord<z.ZodString, z.ZodAny>;
    email: z.ZodOptional<z.ZodString>;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    responses: Record<string, any>;
    email?: string | undefined;
    name?: string | undefined;
}, {
    eventId: string;
    responses: Record<string, any>;
    email?: string | undefined;
    name?: string | undefined;
}>;
export declare const AttendanceSchema: z.ZodObject<{
    id: z.ZodString;
    registrationId: z.ZodString;
    eventId: z.ZodString;
    checkedInAt: z.ZodDate;
    checkedInBy: z.ZodString;
    method: z.ZodEnum<["qr_code", "manual"]>;
}, "strip", z.ZodTypeAny, {
    id: string;
    eventId: string;
    registrationId: string;
    checkedInAt: Date;
    checkedInBy: string;
    method: "qr_code" | "manual";
}, {
    id: string;
    eventId: string;
    registrationId: string;
    checkedInAt: Date;
    checkedInBy: string;
    method: "qr_code" | "manual";
}>;
export declare const CheckInSchema: z.ZodObject<{
    qrCode: z.ZodString;
    eventId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    eventId: string;
    qrCode: string;
}, {
    eventId: string;
    qrCode: string;
}>;
export declare const CertificateTemplateSchema: z.ZodObject<{
    id: z.ZodString;
    eventId: z.ZodString;
    name: z.ZodString;
    template: z.ZodObject<{
        background: z.ZodOptional<z.ZodString>;
        elements: z.ZodArray<z.ZodObject<{
            type: z.ZodEnum<["text", "image", "qr_code"]>;
            content: z.ZodString;
            x: z.ZodNumber;
            y: z.ZodNumber;
            width: z.ZodOptional<z.ZodNumber>;
            height: z.ZodOptional<z.ZodNumber>;
            fontSize: z.ZodOptional<z.ZodNumber>;
            fontFamily: z.ZodOptional<z.ZodString>;
            color: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }, {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        elements: {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }[];
        background?: string | undefined;
    }, {
        elements: {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }[];
        background?: string | undefined;
    }>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    template: {
        elements: {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }[];
        background?: string | undefined;
    };
}, {
    id: string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
    eventId: string;
    template: {
        elements: {
            type: "text" | "qr_code" | "image";
            content: string;
            x: number;
            y: number;
            width?: number | undefined;
            height?: number | undefined;
            fontSize?: number | undefined;
            fontFamily?: string | undefined;
            color?: string | undefined;
        }[];
        background?: string | undefined;
    };
}>;
export declare const CertificateSchema: z.ZodObject<{
    id: z.ZodString;
    registrationId: z.ZodString;
    templateId: z.ZodString;
    certificateUrl: z.ZodString;
    verificationCode: z.ZodString;
    issuedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: string;
    registrationId: string;
    templateId: string;
    certificateUrl: string;
    verificationCode: string;
    issuedAt: Date;
}, {
    id: string;
    registrationId: string;
    templateId: string;
    certificateUrl: string;
    verificationCode: string;
    issuedAt: Date;
}>;
export type User = z.infer<typeof UserSchema>;
export type CreateUser = z.infer<typeof CreateUserSchema>;
export type LoginData = z.infer<typeof LoginSchema>;
export type Event = z.infer<typeof EventSchema>;
export type CreateEvent = z.infer<typeof CreateEventSchema>;
export type FormField = z.infer<typeof FormFieldSchema>;
export type RegistrationForm = z.infer<typeof RegistrationFormSchema>;
export type Registration = z.infer<typeof RegistrationSchema>;
export type CreateRegistration = z.infer<typeof CreateRegistrationSchema>;
export type Attendance = z.infer<typeof AttendanceSchema>;
export type CheckIn = z.infer<typeof CheckInSchema>;
export type CertificateTemplate = z.infer<typeof CertificateTemplateSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
