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
  hero: AppItem[];
  full: AppItem[];
}

export const CATEGORIES: Category[] = [
  {
    key: "chat",
    title: "Chat & Broadcasts",
    hero: [
      { 
        name: "WhatsApp", 
        androidInstalls: "10B+", 
        globalUsers: "3.0B MAU (2025-01)",
        source: "https://play.google.com/store/apps/details?id=com.whatsapp"
      },
      { 
        name: "Telegram", 
        androidInstalls: "1B+", 
        globalUsers: "~1B MAU (2025-03)",
        source: "https://play.google.com/store/apps/details?id=org.telegram.messenger"
      },
      { 
        name: "Slack", 
        androidInstalls: "10M+", 
        globalUsers: "42M DAU / 65M MAU (2024)",
        iosRatings: "35K (US)",
        source: "https://play.google.com/store/apps/details?id=com.Slack"
      },
      { 
        name: "Microsoft Teams", 
        androidInstalls: "500M+", 
        globalUsers: "320M MAU (2024)",
        source: "https://play.google.com/store/apps/details?id=com.microsoft.teams"
      },
      { 
        name: "Discord", 
        androidInstalls: "500M+", 
        globalUsers: "200M MAU",
        iosRatings: "3.2M (US)",
        source: "https://play.google.com/store/apps/details?id=com.discord"
      },
      { name: "iMessage/SMS" }
    ],
    full: [
      { name: "Signal", iosRatings: "1.0M (US)" },
      { name: "GroupMe" },
      { name: "Facebook Messenger" },
      { name: "Instagram DMs" }
    ]
  },
  
  {
    key: "calendar",
    title: "Calendar & Scheduling",
    hero: [
      { 
        name: "Google Calendar", 
        androidInstalls: "5B+", 
        globalUsers: "1B+ users (milestone 2019)",
        iosRatings: "127.2K (US)",
        source: "https://play.google.com/store/apps/details?id=com.google.android.calendar"
      },
      { 
        name: "Outlook Calendar", 
        androidInstalls: "500M+", 
        iosRatings: "8.4M (US)",
        source: "https://play.google.com/store/apps/details?id=com.microsoft.office.outlook"
      },
      { 
        name: "Calendly", 
        androidInstalls: "10M+", 
        globalUsers: "20M+ users",
        source: "https://play.google.com/store/apps/details?id=com.calendly.Droid"
      },
      { 
        name: "Doodle", 
        globalUsers: "30M MAU"
      },
      { 
        name: "Apple Calendar", 
        iosRatings: "127.2K (US)"
      }
    ],
    full: [
      { name: "When2Meet" },
      { name: "TimeTree", globalUsers: "65M users" },
      { name: "Fantastical" }
    ]
  },

  {
    key: "concierge",
    title: "AI Concierge & Research",
    hero: [
      { 
        name: "ChatGPT", 
        androidInstalls: "500M+", 
        globalUsers: "800M+ weekly actives (2025)",
        iosRatings: "4.2M (US)",
        source: "https://play.google.com/store/apps/details?id=com.openai.chatgpt"
      },
      { 
        name: "Gemini", 
        androidInstalls: "100M+", 
        globalUsers: "80M downloads (2024)",
        source: "https://play.google.com/store/apps/details?id=com.google.android.apps.sidekick"
      },
      { 
        name: "Perplexity", 
        androidInstalls: "10M+", 
        globalUsers: "~22M actives (2024)",
        source: "https://play.google.com/store/apps/details?id=ai.perplexity.app.android"
      },
      { 
        name: "Claude", 
        globalUsers: "~100M monthly visits (2025-05)"
      },
      { 
        name: "TripAdvisor", 
        androidInstalls: "100M+",
        source: "https://play.google.com/store/apps/details?id=com.tripadvisor.tripadvisor"
      }
    ],
    full: [
      { name: "Microsoft Copilot" },
      { 
        name: "Google Search", 
        androidInstalls: "10B+",
        source: "https://play.google.com/store/apps/details?id=com.google.android.googlequicksearchbox"
      },
      { 
        name: "Reddit", 
        androidInstalls: "100M+",
        source: "https://play.google.com/store/apps/details?id=com.reddit.frontpage"
      },
      { name: "Yelp" }
    ]
  },

  {
    key: "media",
    title: "Media & Files",
    hero: [
      { 
        name: "Google Drive", 
        androidInstalls: "10B+", 
        globalUsers: "2B users (2024-12)",
        iosRatings: "7.1M (US)",
        source: "https://play.google.com/store/apps/details?id=com.google.android.apps.docs"
      },
      { 
        name: "Google Photos", 
        globalUsers: "1B+ users (milestone 2019)",
        iosRatings: "751.9K (US)"
      },
      { 
        name: "OneDrive", 
        androidInstalls: "1B+", 
        iosRatings: "481.7K (US)",
        source: "https://play.google.com/store/apps/details?id=com.microsoft.skydrive"
      },
      { 
        name: "Dropbox", 
        androidInstalls: "1B+", 
        globalUsers: "700M+ registered (2024)",
        iosRatings: "709.1K (US)",
        source: "https://play.google.com/store/apps/details?id=com.dropbox.android"
      },
      { 
        name: "Apple Photos (iCloud)", 
        globalUsers: "~850M iCloud users (2018)"
      }
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
    key: "polls",
    title: "Polls & Decisions",
    hero: [
      { name: "Doodle", globalUsers: "30M MAU" },
      { name: "Google Forms" },
      { name: "Slido" },
      { name: "Poll Everywhere" },
      { name: "Typeform", globalUsers: "100K+ businesses" }
    ],
    full: [
      { name: "StrawPoll" }
    ]
  },

  {
    key: "tasks",
    title: "Tasks & Checklists",
    hero: [
      { 
        name: "Notion", 
        globalUsers: "100M users (2024-09)"
      },
      { 
        name: "Trello", 
        globalUsers: "50M+ registered (2019)"
      },
      { 
        name: "Asana", 
        globalUsers: "169K+ paying customers (2025-03)"
      },
      { name: "Microsoft To Do" },
      { name: "Apple Reminders" }
    ],
    full: [
      { name: "Google Tasks" },
      { name: "Todoist", globalUsers: "30M users" },
      { name: "Monday.com" }
    ]
  },

  {
    key: "payments",
    title: "Payments & Splits",
    hero: [
      { 
        name: "Venmo", 
        androidInstalls: "50M+", 
        globalUsers: "95.4M active accounts (US)",
        iosRatings: "15.5M (US)"
      },
      { 
        name: "Zelle", 
        globalUsers: "151M enrolled users (2025-02), 2B transactions H1 2025"
      },
      { 
        name: "PayPal", 
        androidInstalls: "100M+", 
        iosRatings: "6.3M (US)"
      },
      { 
        name: "Cash App", 
        androidInstalls: "50M+", 
        globalUsers: "57M monthly transacting (Q2 2025)",
        iosRatings: "7.9M (US)"
      },
      { 
        name: "Splitwise", 
        globalUsers: "Tens of millions registered",
        iosRatings: "20.5K (US)"
      }
    ],
    full: [
      { name: "Apple Pay / Apple Cash" },
      { 
        name: "Google Pay (Wallet)", 
        androidInstalls: "1B+",
        source: "https://play.google.com/store/apps/details?id=com.google.android.apps.walletnfcrel"
      },
      { name: "Tab" },
      { name: "Tricount" },
      { name: "Settle Up" }
    ]
  },

  {
    key: "maps",
    title: "Maps & Meetups",
    hero: [
      { 
        name: "Google Maps", 
        androidInstalls: "10B+"
      },
      { 
        name: "Waze", 
        androidInstalls: "500M+", 
        iosRatings: "3.1M (US)"
      },
      { name: "Apple Maps" },
      { 
        name: "Citymapper", 
        androidInstalls: "10M+"
      },
      { 
        name: "MapQuest"
      }
    ],
    full: [
      { name: "Find My" },
      { name: "Glympse" },
      { name: "what3words" },
      { name: "Roadtrippers" }
    ]
  }
];
