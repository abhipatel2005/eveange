import { FormTemplate } from "../api/forms";

// Feedback form templates with rating scales and feedback fields
export const feedbackTemplates: FormTemplate[] = [
  {
    id: "feedback-basic",
    name: "Basic Event Feedback",
    description: "Simple feedback form with overall rating and comments",
    fields: [
      {
        id: "overall-rating",
        type: "select",
        label: "Overall Event Rating (1-5)",
        placeholder: "Select rating",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "what-liked",
        type: "textarea",
        label: "What did you like most?",
        placeholder: "Share what you enjoyed...",
        required: true,
      },
      {
        id: "what-improve",
        type: "textarea",
        label: "What could we improve?",
        placeholder: "Share your suggestions...",
        required: false,
      },
      {
        id: "would-recommend",
        type: "select",
        label: "Would you recommend this event?",
        required: true,
        options: ["yes", "maybe", "no"],
      },
      {
        id: "additional-comments",
        type: "textarea",
        label: "Additional Comments",
        placeholder: "Any other feedback...",
        required: false,
      },
    ],
  },
  {
    id: "feedback-detailed",
    name: "Detailed Event Feedback",
    description: "Comprehensive feedback across aspects",
    fields: [
      {
        id: "content-quality",
        type: "select",
        label: "Content Quality (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "speaker-rating",
        type: "select",
        label: "Speaker Rating (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "venue-rating",
        type: "select",
        label: "Venue & Facilities (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "organization-rating",
        type: "select",
        label: "Organization (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "value-for-money",
        type: "select",
        label: "Value for Money (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "highlights",
        type: "textarea",
        label: "Event Highlights",
        placeholder: "Best parts of the event",
        required: true,
      },
      {
        id: "improvements",
        type: "textarea",
        label: "Suggestions",
        placeholder: "How can we improve?",
        required: false,
      },
      {
        id: "future-topics",
        type: "textarea",
        label: "Future Topics",
        placeholder: "Topics for future events",
        required: false,
      },
    ],
  },
  {
    id: "feedback-nps",
    name: "NPS + Feedback",
    description: "Net Promoter Score with feedback",
    fields: [
      {
        id: "nps-score",
        type: "select",
        label: "NPS Score (0-10)",
        placeholder: "Select score",
        required: true,
        options: ["10", "9", "8", "7", "6", "5", "4", "3", "2", "1", "0"],
      },
      {
        id: "nps-reason",
        type: "textarea",
        label: "Reason for Score",
        placeholder: "Please explain your rating...",
        required: true,
      },
      {
        id: "overall-experience",
        type: "select",
        label: "Overall Experience (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "met-expectations",
        type: "select",
        label: "Met Expectations?",
        required: true,
        options: ["exceeded", "met", "below"],
      },
      {
        id: "additional-feedback",
        type: "textarea",
        label: "Any additional feedback?",
        placeholder: "Share any other thoughts or suggestions...",
        required: false,
      },
    ],
  },
  {
    id: "feedback-session",
    name: "Session Feedback",
    description: "Feedback form for individual sessions or workshops",
    fields: [
      {
        id: "session-name",
        type: "text",
        label: "Session/Workshop Name",
        placeholder: "Which session are you providing feedback for?",
        required: true,
      },
      {
        id: "session-rating",
        type: "select",
        label: "Overall Session Rating (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "content-relevance",
        type: "select",
        label: "Content Relevance",
        required: true,
        options: [
          "very-relevant",
          "relevant",
          "somewhat-relevant",
          "not-relevant",
        ],
      },
      {
        id: "presenter-effectiveness",
        type: "select",
        label: "Presenter Effectiveness (1-5)",
        required: true,
        options: ["5", "4", "3", "2", "1"],
      },
      {
        id: "key-takeaways",
        type: "textarea",
        label: "Key Takeaways",
        placeholder: "What were your main learnings?",
        required: true,
      },
      {
        id: "session-improvements",
        type: "textarea",
        label: "How could this session be improved?",
        placeholder: "Share your suggestions...",
        required: false,
      },
    ],
  },
];

// Registration form templates (existing ones)
export const registrationTemplates: FormTemplate[] = [
  {
    id: "basic-registration",
    name: "Basic Registration",
    description: "Simple registration with essential contact information",
    fields: [
      {
        id: "full-name",
        type: "text",
        label: "Full Name",
        placeholder: "Enter your full name",
        required: true,
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        placeholder: "your@email.com",
        required: true,
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
        required: true,
      },
    ],
  },
  {
    id: "professional-registration",
    name: "Professional Event",
    description: "Registration for professional events and conferences",
    fields: [
      {
        id: "full-name",
        type: "text",
        label: "Full Name",
        placeholder: "Enter your full name",
        required: true,
      },
      {
        id: "email",
        type: "email",
        label: "Email Address",
        placeholder: "your@email.com",
        required: true,
      },
      {
        id: "phone",
        type: "phone",
        label: "Phone Number",
        placeholder: "+1 (555) 000-0000",
        required: true,
      },
      {
        id: "organization",
        type: "text",
        label: "Organization/Company",
        placeholder: "Your company name",
        required: true,
      },
      {
        id: "job-title",
        type: "text",
        label: "Job Title",
        placeholder: "Your position",
        required: false,
      },
      {
        id: "dietary-restrictions",
        type: "select",
        label: "Dietary Restrictions",
        placeholder: "Select if applicable",
        required: false,
        options: [
          "none",
          "vegetarian",
          "vegan",
          "halal",
          "kosher",
          "gluten-free",
          "other",
        ],
      },
    ],
  },
];

// Combined templates export
export const allTemplates: FormTemplate[] = [
  ...registrationTemplates,
  ...feedbackTemplates,
];

// Helper function to get templates by type
export const getTemplatesByType = (
  type: "registration" | "feedback"
): FormTemplate[] => {
  return type === "feedback" ? feedbackTemplates : registrationTemplates;
};
