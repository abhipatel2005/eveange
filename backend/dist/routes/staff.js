import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import { supabase } from "../config/supabase.js";
const router = Router();
// Test endpoint to debug staff assignments
router.get("/test/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        console.log("🧪 Testing staff assignments for user:", userId);
        // Simple query without joins first
        const { data: assignments, error } = await supabase
            .from("event_users")
            .select("*")
            .eq("user_id", userId)
            .eq("role", "staff");
        console.log("📊 Raw assignments:", JSON.stringify(assignments, null, 2));
        console.log("❌ Assignment error:", error);
        // Also test the event query
        if (assignments && assignments.length > 0) {
            const eventId = assignments[0].event_id;
            const { data: event, error: eventError } = await supabase
                .from("events")
                .select("*")
                .eq("id", eventId)
                .single();
            console.log("📅 Event data:", JSON.stringify(event, null, 2));
            console.log("❌ Event error:", eventError);
        }
        res.json({ assignments, error });
    }
    catch (error) {
        console.error("❌ Test error:", error);
        res.status(500).json({ error: error?.message || String(error) });
    }
});
// Get assigned events for staff member
router.get("/assigned-events", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        console.log("📋 Fetching assigned events for staff user:", userId);
        // Get optional limit parameter from query
        const limit = req.query.limit
            ? parseInt(req.query.limit)
            : undefined;
        // Get staff assignments first, then fetch events separately
        let assignmentQuery = supabase
            .from("event_users")
            .select("*")
            .eq("user_id", userId)
            .eq("role", "staff");
        // Apply limit if provided
        if (limit && limit > 0) {
            assignmentQuery = assignmentQuery.limit(limit);
        }
        const { data: assignments, error: assignmentError } = await assignmentQuery;
        if (assignmentError) {
            console.error("❌ Error fetching staff assignments:", assignmentError);
            return res.status(500).json({
                error: "Failed to fetch assigned events",
                details: assignmentError.message,
            });
        }
        console.log("📊 Staff assignments found:", assignments?.length || 0);
        if (!assignments || assignments.length === 0) {
            return res.json({
                success: true,
                events: [],
            });
        }
        // Get event IDs and fetch events
        const eventIds = assignments.map((a) => a.event_id);
        const { data: events, error: eventsError } = await supabase
            .from("events")
            .select("*")
            .in("id", eventIds)
            .eq("is_active", true);
        if (eventsError) {
            console.error("❌ Error fetching events:", eventsError);
            return res.status(500).json({
                error: "Failed to fetch event details",
                details: eventsError.message,
            });
        }
        console.log("📅 Active events found:", events?.length || 0);
        // Combine assignments with events
        const combinedEvents = assignments
            .map((assignment) => {
            const event = events?.find((e) => e.id === assignment.event_id);
            if (!event)
                return null;
            return {
                id: event.id,
                title: event.title,
                description: event.description,
                start_date: event.start_date,
                end_date: event.end_date,
                location: event.location,
                permissions: {
                    can_check_in: assignment.permissions?.includes("check-in") || false,
                    can_view_stats: assignment.permissions?.includes("view-stats") || false,
                },
                assigned_at: assignment.created_at,
            };
        })
            .filter((event) => event !== null);
        console.log(`✅ Found ${combinedEvents.length} assigned events for staff user:`, userId);
        const response = {
            success: true,
            events: combinedEvents,
        };
        console.log("📤 Sending response:", JSON.stringify(response, null, 2));
        res.json(response);
    }
    catch (error) {
        console.error("❌ Error in staff assigned-events endpoint:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
// Get specific event details for staff (with permission check)
router.get("/events/:eventId", authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { eventId } = req.params;
        console.log("📋 Fetching event details for staff user:", userId, "event:", eventId);
        // Check if staff has access to this event
        const { data: assignment, error: assignmentError } = await supabase
            .from("event_users")
            .select(`
          id,
          permissions,
          events (
            id,
            title,
            description,
            start_date,
            end_date,
            location,
            capacity,
            organizer_id,
            is_active
          )
        `)
            .eq("user_id", userId)
            .eq("event_id", eventId)
            .eq("role", "staff")
            .single();
        if (assignmentError || !assignment) {
            console.error("❌ Staff not assigned to event or event not found:", assignmentError);
            return res.status(403).json({
                error: "Access denied. You are not assigned to this event.",
            });
        }
        // Debug: Log what we got from the query
        console.log("📊 Single assignment query result:", JSON.stringify(assignment, null, 2));
        // Handle both array and object cases for events
        const event = Array.isArray(assignment.events)
            ? assignment.events[0]
            : assignment.events;
        if (!event) {
            return res.status(404).json({
                error: "Event data not found.",
            });
        }
        const eventData = {
            id: event.id,
            title: event.title,
            description: event.description,
            start_date: event.start_date,
            end_date: event.end_date,
            location: event.location,
            capacity: event.capacity,
            permissions: {
                can_check_in: assignment.permissions?.includes("check-in") || false,
                can_view_stats: assignment.permissions?.includes("view-stats") || false,
            },
        };
        console.log("✅ Event details retrieved for staff user:", userId);
        res.json({
            success: true,
            event: eventData,
        });
    }
    catch (error) {
        console.error("❌ Error in staff event details endpoint:", error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
export default router;
