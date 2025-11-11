# Storybook Setup Guide

## Overview

Storybook is a tool for building and documenting UI components in isolation. This guide explains how to set up and use Storybook for Chravel's component library.

## Installation

**Install Storybook:**
```bash
npx storybook@latest init
```

This will:
- Install required dependencies
- Create `.storybook/` configuration directory
- Create example stories
- Add scripts to `package.json`

**Or install manually:**
```bash
npm install --save-dev @storybook/react-vite @storybook/addon-links @storybook/addon-essentials @storybook/addon-interactions @storybook/addon-a11y @storybook/addon-viewport @storybook/test
```

## Configuration

### Main Configuration (`.storybook/main.ts`)

```typescript
import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/components/**/*.stories.@(js|jsx|ts|tsx|mdx)'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',      // Accessibility testing
    '@storybook/addon-viewport',  // Responsive testing
  ],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};
```

### Preview Configuration (`.storybook/preview.tsx`)

```typescript
import type { Preview } from '@storybook/react';
import '../src/index.css'; // Import global styles

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '#1a1a1a' },
      ],
    },
  },
};
```

## Creating Stories

### Example: Button Component Story

Create `src/components/ui/Button.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['default', 'sm', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'Button',
  },
};

export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete',
  },
};

export const Outline: Story = {
  args: {
    variant: 'outline',
    children: 'Outline',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
    children: 'Large Button',
  },
};

export const Small: Story = {
  args: {
    size: 'sm',
    children: 'Small Button',
  },
};
```

### Example: Complex Component Story

Create `src/components/chat/MessageBubble.stories.tsx`:

```typescript
import type { Meta, StoryObj } from '@storybook/react';
import { MessageBubble } from './MessageBubble';

const meta: Meta<typeof MessageBubble> = {
  title: 'Components/Chat/MessageBubble',
  component: MessageBubble,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Sent: Story = {
  args: {
    message: {
      id: '1',
      content: 'Hello, this is a sent message!',
      userId: 'user1',
      createdAt: new Date().toISOString(),
    },
    isOwn: true,
  },
};

export const Received: Story = {
  args: {
    message: {
      id: '2',
      content: 'This is a received message from another user.',
      userId: 'user2',
      createdAt: new Date().toISOString(),
    },
    isOwn: false,
  },
};

export const WithImage: Story = {
  args: {
    message: {
      id: '3',
      content: 'Check out this photo!',
      userId: 'user1',
      createdAt: new Date().toISOString(),
      metadata: {
        attachments: [
          {
            type: 'image',
            url: 'https://via.placeholder.com/300x200',
          },
        ],
      },
    },
    isOwn: true,
  },
};
```

## Running Storybook

**Start Storybook:**
```bash
npm run storybook
```

This opens Storybook at `http://localhost:6006`

**Build static Storybook:**
```bash
npm run build-storybook
```

Outputs to `storybook-static/` directory (can be deployed to static hosting)

## Package.json Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  }
}
```

## Storybook Addons

### Installed Addons

1. **@storybook/addon-essentials**
   - Controls (interactive props)
   - Actions (event handlers)
   - Docs (auto-generated documentation)
   - Viewport (responsive testing)
   - Backgrounds (theme testing)

2. **@storybook/addon-a11y**
   - Accessibility testing
   - WCAG compliance checks
   - Color contrast analysis

3. **@storybook/addon-viewport**
   - Test components at different screen sizes
   - Mobile, tablet, desktop presets

4. **@storybook/addon-interactions**
   - Test user interactions
   - Play functions for complex flows

## Best Practices

### 1. Organize Stories by Feature

```
src/components/
  ├── ui/
  │   ├── Button.stories.tsx
  │   └── Input.stories.tsx
  ├── chat/
  │   ├── MessageBubble.stories.tsx
  │   └── ChatInput.stories.tsx
  └── trips/
      ├── TripCard.stories.tsx
      └── TripList.stories.tsx
```

### 2. Use Descriptive Story Names

```typescript
export const Default: Story = { ... };
export const WithLongText: Story = { ... };
export const LoadingState: Story = { ... };
export const ErrorState: Story = { ... };
```

### 3. Document Props

```typescript
const meta: Meta<typeof Component> = {
  component: Component,
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'primary', 'secondary'],
      description: 'Visual style variant',
    },
    disabled: {
      control: 'boolean',
      description: 'Whether the component is disabled',
    },
  },
};
```

### 4. Test Different States

```typescript
export const Default: Story = { ... };
export const Loading: Story = {
  args: { isLoading: true },
};
export const Error: Story = {
  args: { error: 'Something went wrong' },
};
export const Empty: Story = {
  args: { items: [] },
};
```

### 5. Mock External Dependencies

For components that depend on Supabase, React Query, etc.:

```typescript
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

export const WithData: Story = {
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Story />
      </QueryClientProvider>
    ),
  ],
  args: {
    // Mock data
  },
};
```

## Component Documentation

### Writing MDX Docs

Create `src/components/ui/Button.mdx`:

```mdx
import { Meta, Story } from '@storybook/blocks';
import * as ButtonStories from './Button.stories';

<Meta of={ButtonStories} />

# Button

The Button component is used to trigger actions.

## Usage

<Story of={ButtonStories.Default} />

## Variants

<Story of={ButtonStories.Destructive} />
<Story of={ButtonStories.Outline} />

## Sizes

<Story of={ButtonStories.Large} />
<Story of={ButtonStories.Small} />
```

## Accessibility Testing

The `@storybook/addon-a11y` addon automatically checks:
- Color contrast
- ARIA attributes
- Keyboard navigation
- Screen reader compatibility

View accessibility issues in the "Accessibility" tab of each story.

## Responsive Testing

Use the viewport addon to test components at different screen sizes:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

## Deployment

### Deploy to Netlify/Vercel

**Netlify:**
```toml
# netlify.toml
[build]
  command = "npm run build-storybook"
  publish = "storybook-static"
```

**Vercel:**
```json
{
  "buildCommand": "npm run build-storybook",
  "outputDirectory": "storybook-static"
}
```

### GitHub Pages

```bash
# Build and deploy
npm run build-storybook
npx gh-pages -d storybook-static
```

## Troubleshooting

### Issue: Styles Not Loading

**Solution:** Import CSS in `.storybook/preview.tsx`:
```typescript
import '../src/index.css';
```

### Issue: Vite Build Errors

**Solution:** Ensure Vite plugins are compatible:
```typescript
// .storybook/main.ts
import { mergeConfig } from 'vite';

export default {
  viteFinal: async (config) => {
    return mergeConfig(config, {
      // Vite config
    });
  },
};
```

### Issue: TypeScript Errors

**Solution:** Add Storybook types:
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["@storybook/react"]
  }
}
```

## Example Stories for Chravel Components

### Priority Components to Document

1. **UI Components** (`src/components/ui/`)
   - Button
   - Input
   - Card
   - Dialog
   - Toast

2. **Chat Components** (`src/components/chat/`)
   - MessageBubble
   - ChatInput
   - MessageList

3. **Trip Components** (`src/components/trips/`)
   - TripCard
   - TripList
   - TripHeader

4. **Map Components** (`src/components/maps/`)
   - MapView
   - PlaceMarker
   - RouteDisplay

## Next Steps

1. ✅ Install Storybook
2. ✅ Configure for Vite + React
3. ⏳ Create stories for core UI components
4. ⏳ Document component props and usage
5. ⏳ Set up accessibility testing
6. ⏳ Deploy Storybook to static hosting

---

**Last Updated:** 2025-01-31  
**Maintained By:** Engineering Team
