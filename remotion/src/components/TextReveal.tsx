import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '700', '800'],
  subsets: ['latin'],
});

type TextRevealProps = {
  heading: string;
  subheading?: string;
  goldWord?: string;
};

export const TextReveal: React.FC<TextRevealProps> = ({ heading, subheading, goldWord }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headingProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const subProgress = spring({
    frame,
    fps,
    delay: 12,
    config: { damping: 200 },
  });

  // Gold underline animation
  const lineWidth = interpolate(
    spring({ frame, fps, delay: 8, config: { damping: 200 } }),
    [0, 1],
    [0, 100],
  );

  // Render heading with optional gold word highlight
  const renderHeading = () => {
    if (!goldWord) {
      return heading;
    }
    const parts = heading.split(goldWord);
    return (
      <>
        {parts[0]}
        <span style={{ color: COLORS.gold }}>{goldWord}</span>
        {parts[1] || ''}
      </>
    );
  };

  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: 72,
            fontWeight: 800,
            color: COLORS.white,
            textAlign: 'center',
            opacity: interpolate(headingProgress, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(headingProgress, [0, 1], [30, 0])}px)`,
            lineHeight: 1.2,
            maxWidth: 1200,
          }}
        >
          {renderHeading()}
        </div>

        {/* Gold accent line */}
        <div
          style={{
            width: lineWidth,
            height: 3,
            background: COLORS.gold,
            borderRadius: 2,
          }}
        />

        {subheading && (
          <div
            style={{
              fontFamily,
              fontSize: 28,
              fontWeight: 400,
              color: COLORS.muted,
              textAlign: 'center',
              opacity: interpolate(subProgress, [0, 1], [0, 1]),
              transform: `translateY(${interpolate(subProgress, [0, 1], [20, 0])}px)`,
              maxWidth: 900,
              lineHeight: 1.6,
            }}
          >
            {subheading}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
