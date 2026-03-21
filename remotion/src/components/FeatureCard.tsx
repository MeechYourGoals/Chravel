import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700'],
  subsets: ['latin'],
});

type FeatureCardProps = {
  icon: string;
  title: string;
  description: string;
  index: number;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stagger each card element
  const cardProgress = spring({
    frame,
    fps,
    delay: index * 6,
    config: { damping: 200 },
  });
  const cardOpacity = interpolate(cardProgress, [0, 1], [0, 1]);
  const cardX = interpolate(cardProgress, [0, 1], [60, 0]);

  const titleProgress = spring({
    frame,
    fps,
    delay: index * 6 + 8,
    config: { damping: 200 },
  });

  const descProgress = spring({
    frame,
    fps,
    delay: index * 6 + 14,
    config: { damping: 200 },
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 32,
        opacity: cardOpacity,
        transform: `translateX(${cardX}px)`,
        padding: '28px 40px',
        borderRadius: 20,
        background: `linear-gradient(135deg, ${COLORS.surface} 0%, #141414 100%)`,
        border: `1px solid ${COLORS.border}`,
        width: 700,
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: 52,
          width: 80,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          background: `${COLORS.gold}15`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 32,
            fontWeight: 700,
            color: COLORS.white,
            opacity: interpolate(titleProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(titleProgress, [0, 1], [10, 0])}px)`,
          }}
        >
          {title}
        </div>

        {/* Description */}
        <div
          style={{
            fontFamily,
            fontSize: 20,
            fontWeight: 400,
            color: COLORS.muted,
            lineHeight: 1.5,
            opacity: interpolate(descProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(descProgress, [0, 1], [10, 0])}px)`,
          }}
        >
          {description}
        </div>
      </div>
    </div>
  );
};
