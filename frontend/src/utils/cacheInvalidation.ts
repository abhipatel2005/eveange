import { apiCache } from "../hooks/useCachedApi";

/**
 * Invalidate dashboard cache when user performs actions that change dashboard data
 * This ensures dashboard shows fresh data after:
 * - Creating an event
 * - Registering for an event
 * - Getting assigned as staff
 * - Updating event details
 */
export const invalidateDashboardCache = () => {
  // Invalidate all dashboard caches (pattern matches dashboard-*)
  apiCache.invalidatePattern("^dashboard-");
  console.log(
    "🔄 Dashboard cache invalidated - will fetch fresh data on next visit"
  );
};

/**
 * Invalidate event-specific caches
 */
export const invalidateEventCache = (eventId?: string) => {
  if (eventId) {
    apiCache.invalidatePattern(`^event-${eventId}`);
    console.log(`🔄 Event cache invalidated for event ${eventId}`);
  }
  // Also invalidate events list cache
  apiCache.invalidatePattern("^events-");
  console.log("🔄 Events list cache invalidated");
};

/**
 * Invalidate registration-specific caches
 */
export const invalidateRegistrationCache = () => {
  apiCache.invalidatePattern("^registration-");
  console.log("🔄 Registration cache invalidated");
};

/**
 * Clear all caches (use on logout)
 */
export const clearAllCaches = () => {
  apiCache.clear();
  console.log("🗑️ All caches cleared");
};
