import { Composition } from 'remotion';
import { ChravelLaunch } from './ChravelLaunch';

const FPS = 30;
const DURATION_SECONDS = 60;

export const RemotionRoot = () => {
  return (
    <Composition
      id="ChravelLaunch"
      component={ChravelLaunch}
      durationInFrames={FPS * DURATION_SECONDS}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
