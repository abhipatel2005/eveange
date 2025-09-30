import { create } from "zustand";
import { EventService, type Event } from "../api/events";

interface EventState {
  events: Event[];
  selectedEvent: Event | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadEvents: () => Promise<void>;
  loadEvent: (id: string) => Promise<void>;
  setSelectedEvent: (event: Event | null) => void;
  createEvent: (data: any) => Promise<Event | null>;
  updateEvent: (id: string, data: any) => Promise<Event | null>;
  deleteEvent: (id: string) => Promise<boolean>;
}

export const useEventStore = create<EventState>((set, get) => ({
  events: [],
  selectedEvent: null,
  isLoading: false,
  error: null,

  loadEvents: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await EventService.getEvents();

      if (response.success && response.data) {
        set({ events: response.data.events });
      } else {
        set({ error: response.error || "Failed to load events" });
      }
    } catch (error) {
      set({ error: "Error loading events" });
    } finally {
      set({ isLoading: false });
    }
  },

  loadEvent: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await EventService.getEventById(id);

      if (response.success && response.data) {
        set({ selectedEvent: response.data.event });

        // Update the event in the events list if it exists
        const { events } = get();
        const updatedEvents = events.map((event) =>
          event.id === id ? response.data!.event : event
        );
        set({ events: updatedEvents });
      } else {
        set({ error: response.error || "Failed to load event" });
      }
    } catch (error) {
      set({ error: "Error loading event" });
    } finally {
      set({ isLoading: false });
    }
  },

  setSelectedEvent: (event: Event | null) => {
    set({ selectedEvent: event });
  },

  createEvent: async (data: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await EventService.createEvent(data);

      if (response.success && response.data) {
        const newEvent = response.data.event;
        set((state) => ({
          events: [...state.events, newEvent],
          selectedEvent: newEvent,
        }));
        return newEvent;
      } else {
        set({ error: response.error || "Failed to create event" });
        return null;
      }
    } catch (error) {
      set({ error: "Error creating event" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  updateEvent: async (id: string, data: any) => {
    try {
      set({ isLoading: true, error: null });
      const response = await EventService.updateEvent(id, data);

      if (response.success && response.data) {
        const updatedEvent = response.data.event;
        set((state) => ({
          events: state.events.map((event) =>
            event.id === id ? updatedEvent : event
          ),
          selectedEvent:
            state.selectedEvent?.id === id ? updatedEvent : state.selectedEvent,
        }));
        return updatedEvent;
      } else {
        set({ error: response.error || "Failed to update event" });
        return null;
      }
    } catch (error) {
      set({ error: "Error updating event" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteEvent: async (id: string) => {
    try {
      set({ isLoading: true, error: null });
      const response = await EventService.deleteEvent(id);

      if (response.success) {
        set((state) => ({
          events: state.events.filter((event) => event.id !== id),
          selectedEvent:
            state.selectedEvent?.id === id ? null : state.selectedEvent,
        }));
        return true;
      } else {
        set({ error: response.error || "Failed to delete event" });
        return false;
      }
    } catch (error) {
      set({ error: "Error deleting event" });
      return false;
    } finally {
      set({ isLoading: false });
    }
  },
}));
