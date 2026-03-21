import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { LogoReveal } from './components/LogoReveal';
import { TextReveal } from './components/TextReveal';
import { FeatureShowcase } from './components/FeatureShowcase';
import { StatCounter } from './components/StatCounter';
import { CallToAction } from './components/CallToAction';

const FPS = 30;
const TRANSITION_FRAMES = 15;

/**
 * Chravel Launch Video — 60 seconds at 30fps = 1800 frames
 *
 * Timeline:
 * 1. Logo Reveal (0-5s)             = 150 frames
 * 2. "Trip planning reimagined" (5-10s) = 150 frames
 * 3. Features Set 1: Plan & Collaborate (10-20s) = 300 frames
 * 4. Features Set 2: AI & Smart Tools (20-30s) = 300 frames
 * 5. "Everything in one place" (30-35s) = 150 frames
 * 6. Features Set 3: Stay Connected (35-45s) = 300 frames
 * 7. Stats section (45-52s) = 210 frames
 * 8. CTA (52-60s) = 240 frames
 *
 * Total scene frames: 1800
 * Minus 7 transitions × 15 frames = 105
 * = 1695 net frames. We pad scenes to compensate.
 */

const PLAN_FEATURES = [
  {
    icon: '🗺️',
    title: 'Trip Management',
    description: 'Create, share, and collaborate on trips with your crew',
  },
  {
    icon: '📅',
    title: 'Calendar Sync',
    description: 'Bi-directional Google Calendar sync with smart reminders',
  },
  {
    icon: '💰',
    title: 'Expense Splitting',
    description: 'Track costs and settle up — no more awkward money talks',
  },
];

const AI_FEATURES = [
  {
    icon: '🤖',
    title: 'AI Concierge',
    description: 'Your personal travel assistant powered by Gemini AI',
  },
  {
    icon: '📧',
    title: 'Smart Import',
    description: 'Auto-import itineraries from Gmail, PDFs, and receipts',
  },
  {
    icon: '📸',
    title: 'Media Gallery',
    description: 'AI-tagged photos and videos with shared trip albums',
  },
];

const CONNECT_FEATURES = [
  {
    icon: '💬',
    title: 'Group Chat',
    description: 'Real-time messaging with channels, threads, and reactions',
  },
  {
    icon: '📍',
    title: 'Live Location',
    description: 'Share your location with your group in real time',
  },
  {
    icon: '📢',
    title: 'Broadcasts',
    description: 'Trip-wide announcements everyone actually sees',
  },
];

export const ChravelLaunch: React.FC = () => {
  return (
    <TransitionSeries>
      {/* Scene 1: Logo Reveal */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <LogoReveal />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 2: Hook text */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <TextReveal
          heading="Trip Planning Reimagined"
          subheading="One app for every trip. Every traveler. Every moment."
          goldWord="Reimagined"
        />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-right' })}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 3: Plan & Collaborate features */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <FeatureShowcase sectionTitle="Plan & Collaborate" features={PLAN_FEATURES} />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 4: AI & Smart Tools features */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <FeatureShowcase sectionTitle="AI-Powered Intelligence" features={AI_FEATURES} />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-left' })}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 5: Mid-video hook */}
      <TransitionSeries.Sequence durationInFrames={5 * FPS}>
        <TextReveal
          heading="Everything Your Trip Needs"
          subheading="Built for travelers who move fast and plan smart."
          goldWord="Everything"
        />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 6: Stay Connected features */}
      <TransitionSeries.Sequence durationInFrames={10 * FPS}>
        <FeatureShowcase sectionTitle="Stay Connected" features={CONNECT_FEATURES} />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 7: Stats */}
      <TransitionSeries.Sequence durationInFrames={7 * FPS}>
        <StatCounter />
      </TransitionSeries.Sequence>

      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
      />

      {/* Scene 8: Call to Action */}
      <TransitionSeries.Sequence durationInFrames={8 * FPS + 7 * TRANSITION_FRAMES}>
        <CallToAction />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};
