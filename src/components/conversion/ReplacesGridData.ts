export interface AppItem {
  name: string;
  androidInstalls?: string;
  iosRatings?: string;
  globalUsers?: string;
  source?: string;
}

export interface Category {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  hero: AppItem[];
  full: AppItem[];
}

export const CATEGORIES: Category[] = [
  {
    key: "chat",
    title: "Chat",
    subtitle: "Your group chat — Less chaos, Less Scrolling to find info",
    icon: "💬",
    hero: [
      { name: "WhatsApp" },
      { name: "Telegram" },
      { name: "Slack" },
      { name: "Microsoft Teams" },
      { name: "Discord" },
      { name: "iMessage/SMS" }
    ],
    full: [
      { name: "Signal" },
      { name: "GroupMe" },
      { name: "Facebook Messenger" }
    ]
  },

  {
    key: "calendar",
    title: "Calendar",
    subtitle: "One source of truth for dates, times, and changes",
    icon: "📅",
    hero: [
      { name: "Google Calendar" },
      { name: "Outlook Calendar" },
      { name: "Apple Calendar" },
      { name: "Calendly" },
      { name: "Doodle" }
    ],
    full: []
  },

  {
    key: "concierge",
    title: "AI Concierge",
    subtitle: "Ask once. Get answers instantly.",
    icon: "🤖",
    hero: [
      { name: "ChatGPT" },
      { name: "Gemini" },
      { name: "Perplexity" },
      { name: "Claude" },
      { name: "TripAdvisor" }
    ],
    full: [
      { name: "Google Search" },
      { name: "Reddit" },
      { name: "Yelp" }
    ]
  },

  {
    key: "media",
    title: "Media",
    subtitle: "Every file, photo, and memory — organized automatically",
    icon: "📸",
    hero: [
      { name: "Google Drive" },
      { name: "Google Photos" },
      { name: "Dropbox" },
      { name: "OneDrive" },
      { name: "Apple Photos" }
    ],
    full: [
      { name: "iCloud Drive" },
      { name: "Box" },
      { name: "WeTransfer" },
      { name: "Apple Files" },
      { name: "Snapchat Memories" },
      { name: "Instagram" }
    ]
  },

  {
    key: "payments",
    title: "Payments",
    subtitle: "Know who paid. Know who owes. Instantly.",
    icon: "💳",
    hero: [
      { name: "Venmo" },
      { name: "Zelle" },
      { name: "PayPal" },
      { name: "Cash App" },
      { name: "Splitwise" }
    ],
    full: [
      { name: "Apple Pay/Cash" },
      { name: "Google Pay" },
      { name: "Tab" },
      { name: "Settle Up" }
    ]
  },

  {
    key: "places",
    title: "Places",
    subtitle: "Never ask \"where are we going?\" again",
    icon: "📍",
    hero: [
      { name: "Google Maps" },
      { name: "Apple Maps" },
      { name: "Waze" },
      { name: "Citymapper" },
      { name: "MapQuest" }
    ],
    full: [
      { name: "Find My" },
      { name: "Glympse" },
      { name: "Roadtrippers" }
    ]
  },

  {
    key: "polls",
    title: "Polls",
    subtitle: "Decide faster. Move forward.",
    icon: "📊",
    hero: [
      { name: "Doodle" },
      { name: "Google Forms" },
      { name: "Slido" },
      { name: "Poll Everywhere" },
      { name: "Typeform" }
    ],
    full: [
      { name: "PollForAll" }
    ]
  },

  {
    key: "tasks",
    title: "Tasks",
    subtitle: "Everyone knows what they're responsible for",
    icon: "✅",
    hero: [
      { name: "Notion" },
      { name: "Asana" },
      { name: "Microsoft To Do" },
      { name: "Apple Reminders" },
      { name: "Google Tasks" }
    ],
    full: [
      { name: "Monday.com" },
      { name: "Trello" },
      { name: "Todoist" }
    ]
  }
];
