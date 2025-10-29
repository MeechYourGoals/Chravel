import React from 'react';

const Healthz: React.FC = () => {
  const payload = {
    buildId: import.meta.env.VITE_BUILD_ID ?? null,
    mode: import.meta.env.MODE,
    features: { placesLinksV2: true, mediaLinks: false }
  };

  return (
    <pre data-testid="healthz" className="text-xs p-3 bg-black/40 rounded-md text-white">
      {JSON.stringify(payload, null, 2)}
    </pre>
  );
};

export default Healthz;
