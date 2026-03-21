import {
  AbsoluteFill,
  interpolate,
  spring,
  Easing,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '800'],
  subsets: ['latin'],
});

type Stat = {
  value: string;
  label: string;
};

const STATS: Stat[] = [
  { value: '10+', label: 'Trip Features' },
  { value: '∞', label: 'Travelers' },
  { value: 'AI', label: 'Powered Concierge' },
  { value: '0', label: 'Missed Moments' },
];

export const StatCounter: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Subtle gold gradient bar at top */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          opacity: interpolate(frame, [0, 20], [0, 0.6], {
            extrapolateRight: 'clamp',
          }),
        }}
      />

      <div
        style={{
          display: 'flex',
          gap: 100,
          alignItems: 'center',
        }}
      >
        {STATS.map((stat, i) => {
          const progress = spring({
            frame,
            fps,
            delay: i * 8,
            config: { damping: 200 },
          });
          const scale = interpolate(progress, [0, 1], [0.5, 1]);
          const opacity = interpolate(progress, [0, 1], [0, 1]);

          return (
            <div
              key={stat.label}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
                transform: `scale(${scale})`,
                opacity,
              }}
            >
              <div
                style={{
                  fontFamily,
                  fontSize: 72,
                  fontWeight: 800,
                  color: COLORS.gold,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily,
                  fontSize: 20,
                  fontWeight: 400,
                  color: COLORS.muted,
                  textTransform: 'uppercase',
                  letterSpacing: 3,
                }}
              >
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom gold gradient bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, transparent, ${COLORS.gold}, transparent)`,
          opacity: interpolate(frame, [0, 20], [0, 0.6], {
            extrapolateRight: 'clamp',
          }),
        }}
      />
    </AbsoluteFill>
  );
};
