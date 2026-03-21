import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';
import { FeatureCard } from './FeatureCard';

const { fontFamily } = loadFont('normal', {
  weights: ['600', '700'],
  subsets: ['latin'],
});

type FeatureShowcaseProps = {
  sectionTitle: string;
  features: Array<{
    icon: string;
    title: string;
    description: string;
  }>;
};

export const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({ sectionTitle, features }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Section title entrance
  const titleProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);
  const titleY = interpolate(titleProgress, [0, 1], [30, 0]);

  // Gold accent line
  const lineWidth = interpolate(
    spring({ frame, fps, delay: 5, config: { damping: 200 } }),
    [0, 1],
    [0, 80],
  );

  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 80,
      }}
    >
      {/* Section title */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 22,
            fontWeight: 600,
            color: COLORS.gold,
            letterSpacing: 6,
            textTransform: 'uppercase',
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
          }}
        >
          {sectionTitle}
        </div>
        <div
          style={{
            width: lineWidth,
            height: 2,
            background: COLORS.gold,
            borderRadius: 1,
          }}
        />
      </div>

      {/* Feature cards */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          marginTop: 40,
        }}
      >
        {features.map((feature, i) => (
          <FeatureCard
            key={feature.title}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
            index={i}
          />
        ))}
      </div>
    </AbsoluteFill>
  );
};
