import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  CreateEventSchema,
  UpdateEventSchema,
} from "../../../shared/dist/schemas.js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export class EventController {
  // Create a new event (Organizers only)
  static async createEvent(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Fetch user profile to check org/phone
      const { data: userProfile, error: userProfileError } = await supabase
        .from("users")
        .select("id, organization_name, phone_number")
        .eq("id", userId)
        .single();
      if (userProfileError || !userProfile) {
        res.status(403).json({
          success: false,
          error: "User profile not found",
        });
        return;
      }
      if (!userProfile.organization_name || !userProfile.phone_number) {
        res.status(403).json({
          success: false,
          error: "Organization name and phone number required to create events",
        });
        return;
      }

      const validatedData = CreateEventSchema.parse(req.body);

      // Create the event
      const { data: event, error } = await supabase
        .from("events")
        .insert({
          title: validatedData.title,
          description: validatedData.description,
          start_date: validatedData.startDate,
          end_date: validatedData.endDate,
          location: validatedData.location,
          capacity: validatedData.capacity,
          category_id: validatedData.categoryId,
          banner_url: validatedData.bannerUrl,
          visibility: validatedData.visibility,
          organizer_id: userId,
          registration_deadline: validatedData.registrationDeadline,
          is_paid: validatedData.isPaid,
          price: validatedData.price,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select(
          `
          id, title, description, start_date, end_date, location, 
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email),
          category:category_id(id, name, color)
        `
        )
        .single();

      if (error) {
        console.error("Event creation error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to create event",
        });
        return;
      }

      // Add creator to event_users as organizer with full permissions
      const defaultOrganizerPermissions = [
        "manage-event",
        "delete-event",
        "view-registrations",
        "manage-registrations",
        "export-registrations",
        "check-in",
        "manage-staff",
        "view-reports",
        "manage-reports",
        "send-emails",
        "send-notifications",
      ];

      const { error: eventUserError } = await supabase
        .from("event_users")
        .insert({
          event_id: event.id,
          user_id: userId,
          role: "organizer",
          permissions: defaultOrganizerPermissions,
          assigned_by: userId,
          is_active: true,
        });
      if (eventUserError) {
        console.error("Failed to add creator to event_users:", eventUserError);
        // Optionally: return error or continue
      }

      res.status(201).json({
        success: true,
        message: "Event created successfully",
        data: { event },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid event data",
          details: error.errors,
        });
        return;
      }

      console.error("Create event error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Get all events (with pagination and filters)
  static async getEvents(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        visibility,
        categoryId,
        organizerId,
        search,
        upcoming = "true",
        free,
        week,
      } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from("events")
        .select(
          `
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at,
          organizer:organizer_id(id, name, email, organization_name),
          category:category_id(id, name, color),
          registrations:registrations(count)
        `,
          { count: "exact" }
        )
        .range(offset, offset + Number(limit) - 1)
        .order("start_date", { ascending: true });

      // For public access, only show public events
      if (visibility && visibility !== "all") {
        query = query.eq("visibility", visibility);
      } else {
        // Default to public events only for public endpoint
        query = query.eq("visibility", "public");
      }

      if (categoryId) {
        query = query.eq("category_id", categoryId);
      }

      if (organizerId) {
        query = query.eq("organizer_id", organizerId);
      }

      if (search) {
        query = query.or(
          `title.ilike.%${search}%, description.ilike.%${search}%, location.ilike.%${search}%`
        );
      }

      if (upcoming === "true") {
        query = query.gte("start_date", new Date().toISOString());
      }

      // Filter for free events (is_paid = false or price = 0)
      if (free === "true") {
        query = query.eq("is_paid", false);
      }

      // Filter for events happening within the next 7 days
      if (week === "true") {
        const nowIso = new Date().toISOString();
        const sevenDaysLater = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        ).toISOString();
        query = query
          .gte("start_date", nowIso)
          .lte("start_date", sevenDaysLater);
      }

      const { data: events, error, count } = await query;

      if (error) {
        console.error("Get events error:", error);
        res.status(500).json({
          success: false,
          error:
            "Failed to fetch events. Please check your database connection.",
        });
        return;
      }

      // Return success even with no events, with a helpful message
      res.json({
        success: true,
        data: {
          events: events || [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: count || 0,
            pages: Math.ceil((count || 0) / Number(limit)),
          },
        },
        message:
          !events || events.length === 0
            ? upcoming === "true"
              ? "No upcoming events found"
              : "No events found"
            : undefined,
      });
    } catch (error: any) {
      console.error("Get events error:", {
        message: error?.message,
        details: error?.stack,
        hint: error?.hint || "",
        code: error?.code || "",
      });

      // Provide more specific error messages
      let errorMessage = "Internal server error";
      if (error?.message?.includes("fetch failed")) {
        errorMessage =
          "Unable to connect to database. Please check your network connection and database configuration.";
      } else if (error?.code === "PGRST116") {
        errorMessage = "Database query error. Please contact support.";
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  // Get a single event by ID
  static async getEventById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: event, error } = await supabase
        .from("events")
        .select(
          `
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email, organization_name, phone_number),
          category:category_id(id, name, color, description),
          registrations:registrations(
            id, status, created_at,
            user:user_id(id, name, email)
          )
        `
        )
        .eq("id", id)
        .single();

      if (error || !event) {
        res.status(404).json({
          success: false,
          error: "Event not found",
        });
        return;
      }

      // For public endpoint, only show public events
      if (event.visibility !== "public") {
        res.status(404).json({
          success: false,
          error: "Event not found",
        });
        return;
      }

      res.json({
        success: true,
        data: { event },
      });
    } catch (error) {
      console.error("Get event by ID error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Update an event (Organizers only - own events)
  static async updateEvent(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Check if event exists and user has permission
      const { data: existingEvent, error: fetchError } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", id)
        .single();

      if (fetchError || !existingEvent) {
        res.status(404).json({
          success: false,
          error: "Event not found",
        });
        return;
      }

      // Check permissions - only event owner can edit
      if (existingEvent.organizer_id !== userId) {
        res.status(403).json({
          success: false,
          error: "You can only edit your own events",
        });
        return;
      }

      const validatedData = UpdateEventSchema.parse(req.body);

      const { data: event, error } = await supabase
        .from("events")
        .update({
          ...validatedData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select(
          `
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email),
          category:category_id(id, name, color)
        `
        )
        .single();

      if (error) {
        console.error("Update event error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to update event",
        });
        return;
      }

      res.json({
        success: true,
        message: "Event updated successfully",
        data: { event },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid event data",
          details: error.errors,
        });
        return;
      }

      console.error("Update event error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Delete an event (Organizers only - own events)
  static async deleteEvent(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Check if event exists and user has permission
      const { data: existingEvent, error: fetchError } = await supabase
        .from("events")
        .select("organizer_id")
        .eq("id", id)
        .single();

      if (fetchError || !existingEvent) {
        res.status(404).json({
          success: false,
          error: "Event not found",
        });
        return;
      }

      // Check permissions - only event owner can delete
      if (existingEvent.organizer_id !== userId) {
        res.status(403).json({
          success: false,
          error: "You can only delete your own events",
        });
        return;
      }

      const { error } = await supabase.from("events").delete().eq("id", id);

      if (error) {
        console.error("Delete event error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to delete event",
        });
        return;
      }

      res.json({
        success: true,
        message: "Event deleted successfully",
      });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  // Get events for the authenticated organizer (Dashboard)
  static async getMyEvents(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      // Get optional limit parameter from query
      const limit = req.query.limit
        ? parseInt(req.query.limit as string)
        : undefined;

      let query = supabase
        .from("events")
        .select(
          `
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          category:category_id(id, name, color),
          registrations:registrations(count)
        `
        )
        .eq("organizer_id", userId)
        .order("created_at", { ascending: false });

      // Apply limit if provided
      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      const { data: events, error } = await query;

      if (error) {
        console.error("Get my events error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch events",
        });
        return;
      }

      res.json({
        success: true,
        data: { events },
      });
    } catch (error) {
      console.error("Get my events error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }

  /**
   * Get user's role for a specific event from event_users table
   * GET /api/events/:id/user-role
   */
  static async getUserEventRole(
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> {
    try {
      const userId = req.user?.id;
      const { id } = req.params;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: "Authentication required",
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          error: "Event ID is required",
        });
        return;
      }

      // Check if user has a role in event_users table for this event
      const { data: eventUser, error } = await supabase
        .from("event_users")
        .select("role, permissions, is_active")
        .eq("event_id", id)
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "no rows returned" which is okay
        console.error("Get user event role error:", error);
        res.status(500).json({
          success: false,
          error: "Failed to fetch user role",
        });
        return;
      }

      // Return the role if found, otherwise null
      res.json({
        success: true,
        data: {
          role: eventUser?.role || null,
          permissions: eventUser?.permissions || [],
        },
      });
    } catch (error) {
      console.error("Get user event role error:", error);
      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    }
  }
}
