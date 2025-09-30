import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { CreateEventSchema, UpdateEventSchema, } from "../../../shared/dist/schemas.js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export class EventController {
    // Create a new event (Organizers only)
    static async createEvent(req, res) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            if (userRole !== "organizer" && userRole !== "admin") {
                res.status(403).json({
                    success: false,
                    error: "Only organizers can create events",
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
                .select(`
          id, title, description, start_date, end_date, location, 
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email),
          category:category_id(id, name, color)
        `)
                .single();
            if (error) {
                console.error("Event creation error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to create event",
                });
                return;
            }
            res.status(201).json({
                success: true,
                message: "Event created successfully",
                data: { event },
            });
        }
        catch (error) {
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
    static async getEvents(req, res) {
        try {
            const { page = 1, limit = 10, visibility, categoryId, organizerId, search, upcoming = "true", } = req.query;
            const offset = (Number(page) - 1) * Number(limit);
            let query = supabase
                .from("events")
                .select(`
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at,
          organizer:organizer_id(id, name, email, organization_name),
          category:category_id(id, name, color),
          registrations:registrations(count)
        `, { count: "exact" })
                .range(offset, offset + Number(limit) - 1)
                .order("start_date", { ascending: true });
            // For public access, only show public events
            if (visibility && visibility !== "all") {
                query = query.eq("visibility", visibility);
            }
            else {
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
                query = query.or(`title.ilike.%${search}%, description.ilike.%${search}%, location.ilike.%${search}%`);
            }
            if (upcoming === "true") {
                query = query.gte("start_date", new Date().toISOString());
            }
            const { data: events, error, count } = await query;
            if (error) {
                console.error("Get events error:", error);
                res.status(500).json({
                    success: false,
                    error: "Failed to fetch events",
                });
                return;
            }
            res.json({
                success: true,
                data: {
                    events,
                    pagination: {
                        page: Number(page),
                        limit: Number(limit),
                        total: count || 0,
                        pages: Math.ceil((count || 0) / Number(limit)),
                    },
                },
            });
        }
        catch (error) {
            console.error("Get events error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get a single event by ID
    static async getEventById(req, res) {
        try {
            const { id } = req.params;
            const { data: event, error } = await supabase
                .from("events")
                .select(`
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email, organization_name, phone_number),
          category:category_id(id, name, color, description),
          registrations:registrations(
            id, status, created_at,
            user:user_id(id, name, email)
          )
        `)
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
        }
        catch (error) {
            console.error("Get event by ID error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Update an event (Organizers only - own events)
    static async updateEvent(req, res) {
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
            // Check permissions
            if (userRole !== "admin" && existingEvent.organizer_id !== userId) {
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
                .select(`
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          organizer:organizer_id(id, name, email),
          category:category_id(id, name, color)
        `)
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
        }
        catch (error) {
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
    static async deleteEvent(req, res) {
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
            // Check permissions
            if (userRole !== "admin" && existingEvent.organizer_id !== userId) {
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
        }
        catch (error) {
            console.error("Delete event error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
    // Get events for the authenticated organizer (Dashboard)
    static async getMyEvents(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({
                    success: false,
                    error: "Authentication required",
                });
                return;
            }
            const { data: events, error } = await supabase
                .from("events")
                .select(`
          id, title, description, start_date, end_date, location,
          capacity, banner_url, visibility, registration_deadline,
          is_paid, price, created_at, updated_at,
          category:category_id(id, name, color),
          registrations:registrations(count)
        `)
                .eq("organizer_id", userId)
                .order("created_at", { ascending: false });
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
        }
        catch (error) {
            console.error("Get my events error:", error);
            res.status(500).json({
                success: false,
                error: "Internal server error",
            });
        }
    }
}
