export default function Healthz() {
  const buildId = import.meta.env.VITE_BUILD_ID ?? 'dev';
  const mode = import.meta.env.MODE;
  
  const healthData = {
    buildId,
    mode,
    timestamp: new Date().toISOString(),
    features: {
      placesLinksV2: true,
      mediaLinks: false,
      serviceWorkerCleared: true,
      nominatimFallback: true,
      tripSpecificMockData: true
    },
    status: 'ok'
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Health Check</h1>
        <pre className="bg-gray-800 p-6 rounded-lg overflow-auto text-sm">
          {JSON.stringify(healthData, null, 2)}
        </pre>
      </div>
    </div>
  );
}
