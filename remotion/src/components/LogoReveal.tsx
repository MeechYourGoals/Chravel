import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { loadFont } from '@remotion/google-fonts/Inter';
import { COLORS } from '../theme';

const { fontFamily } = loadFont('normal', {
  weights: ['700', '800'],
  subsets: ['latin'],
});

export const LogoReveal: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Gold ring scale animation
  const ringScale = spring({ frame, fps, config: { damping: 200 } });

  // Logo text fade + slide up
  const textProgress = spring({
    frame,
    fps,
    delay: 10,
    config: { damping: 200 },
  });
  const textOpacity = interpolate(textProgress, [0, 1], [0, 1]);
  const textY = interpolate(textProgress, [0, 1], [40, 0]);

  // Tagline fade in
  const taglineProgress = spring({
    frame,
    fps,
    delay: 25,
    config: { damping: 200 },
  });
  const taglineOpacity = interpolate(taglineProgress, [0, 1], [0, 1]);
  const taglineY = interpolate(taglineProgress, [0, 1], [20, 0]);

  // Subtle gold glow pulse
  const glowOpacity = interpolate(frame, [0, 30, 60, 90], [0, 0.3, 0.15, 0.25], {
    extrapolateRight: 'clamp',
  });

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
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.gold}40 0%, transparent 70%)`,
          opacity: glowOpacity,
          transform: `scale(${ringScale * 1.5})`,
        }}
      />

      {/* Gold ring */}
      <div
        style={{
          width: 180,
          height: 180,
          borderRadius: '50%',
          border: `3px solid ${COLORS.gold}`,
          transform: `scale(${ringScale})`,
          opacity: ringScale,
          position: 'absolute',
          top: '50%',
          left: '50%',
          marginLeft: -90,
          marginTop: -140,
        }}
      />

      {/* Logo text */}
      <div
        style={{
          fontFamily,
          fontSize: 96,
          fontWeight: 800,
          color: COLORS.white,
          letterSpacing: 8,
          opacity: textOpacity,
          transform: `translateY(${textY}px)`,
          textTransform: 'uppercase',
          marginTop: 80,
        }}
      >
        Chravel
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily,
          fontSize: 28,
          fontWeight: 700,
          color: COLORS.gold,
          letterSpacing: 4,
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
          marginTop: 100,
          textTransform: 'uppercase',
        }}
      >
        Travel Together. Effortlessly.
      </div>
    </AbsoluteFill>
  );
};
