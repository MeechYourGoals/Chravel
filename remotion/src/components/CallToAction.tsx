import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';

const { fontFamily } = loadFont('normal', {
  weights: ['400', '600', '700', '800'],
  subsets: ['latin'],
});

export const CallToAction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Main CTA text
  const headingProgress = spring({
    frame,
    fps,
    config: { damping: 200 },
  });
  const headingOpacity = interpolate(headingProgress, [0, 1], [0, 1]);
  const headingY = interpolate(headingProgress, [0, 1], [40, 0]);

  // Button entrance
  const buttonProgress = spring({
    frame,
    fps,
    delay: 15,
    config: { damping: 15, stiffness: 120 },
  });
  const buttonScale = interpolate(buttonProgress, [0, 1], [0.8, 1]);
  const buttonOpacity = interpolate(buttonProgress, [0, 1], [0, 1]);

  // URL text
  const urlProgress = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });

  // Pulsing glow on button
  const glowScale = interpolate(frame % 60, [0, 30, 60], [1, 1.15, 1]);

  return (
    <AbsoluteFill
      style={{
        background: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: 800,
          height: 800,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.gold}20 0%, transparent 60%)`,
          opacity: 0.5,
        }}
      />

      {/* Heading */}
      <div
        style={{
          fontFamily,
          fontSize: 64,
          fontWeight: 800,
          color: COLORS.white,
          textAlign: 'center',
          opacity: headingOpacity,
          transform: `translateY(${headingY}px)`,
          lineHeight: 1.2,
          marginBottom: 20,
        }}
      >
        Plan Your Next
        <br />
        <span style={{ color: COLORS.gold }}>Adventure</span>
      </div>

      {/* CTA Button */}
      <div
        style={{
          marginTop: 40,
          opacity: buttonOpacity,
          transform: `scale(${buttonScale})`,
        }}
      >
        <div
          style={{
            position: 'relative',
            display: 'inline-flex',
          }}
        >
          {/* Glow effect behind button */}
          <div
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: 24,
              background: COLORS.gold,
              opacity: 0.3,
              filter: 'blur(20px)',
              transform: `scale(${glowScale})`,
            }}
          />
          <div
            style={{
              fontFamily,
              fontSize: 28,
              fontWeight: 700,
              color: COLORS.background,
              background: `linear-gradient(135deg, ${COLORS.gold} 0%, ${COLORS.goldLight} 100%)`,
              padding: '20px 60px',
              borderRadius: 16,
              position: 'relative',
            }}
          >
            Get Started Free
          </div>
        </div>
      </div>

      {/* URL */}
      <div
        style={{
          fontFamily,
          fontSize: 24,
          fontWeight: 600,
          color: COLORS.muted,
          marginTop: 50,
          letterSpacing: 2,
          opacity: interpolate(urlProgress, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(urlProgress, [0, 1], [15, 0])}px)`,
        }}
      >
        chravel.com
      </div>
    </AbsoluteFill>
  );
};
