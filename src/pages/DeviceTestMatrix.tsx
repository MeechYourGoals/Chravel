import React, { useState } from 'react';
import { ArrowLeft, Monitor, Tablet, Smartphone, Maximize2, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface DeviceConfig {
  name: string;
  width: number;
  height: number;
  category: 'phone' | 'foldable' | 'tablet' | 'desktop';
  orientation: 'portrait' | 'landscape';
}

const DEVICES: DeviceConfig[] = [
  // Phones - Portrait
  { name: 'iPhone SE', width: 375, height: 667, category: 'phone', orientation: 'portrait' },
  { name: 'iPhone 14', width: 390, height: 844, category: 'phone', orientation: 'portrait' },
  { name: 'iPhone 15 Pro Max', width: 430, height: 932, category: 'phone', orientation: 'portrait' },
  { name: 'Pixel 8', width: 411, height: 915, category: 'phone', orientation: 'portrait' },
  { name: 'Galaxy S24', width: 412, height: 915, category: 'phone', orientation: 'portrait' },
  
  // Foldables
  { name: 'Galaxy Fold (Folded)', width: 375, height: 800, category: 'foldable', orientation: 'portrait' },
  { name: 'Galaxy Fold (Unfolded)', width: 900, height: 1176, category: 'foldable', orientation: 'portrait' },
  { name: 'iPhone Fold (Rumored)', width: 900, height: 1200, category: 'foldable', orientation: 'portrait' },
  
  // Tablets - Portrait
  { name: 'iPad Mini Portrait', width: 744, height: 1133, category: 'tablet', orientation: 'portrait' },
  { name: 'iPad Mini Landscape', width: 1133, height: 744, category: 'tablet', orientation: 'landscape' },
  { name: 'iPad 10.9" Portrait', width: 820, height: 1180, category: 'tablet', orientation: 'portrait' },
  { name: 'iPad 10.9" Landscape', width: 1180, height: 820, category: 'tablet', orientation: 'landscape' },
  { name: 'iPad Pro 11" Portrait', width: 834, height: 1194, category: 'tablet', orientation: 'portrait' },
  { name: 'iPad Pro 11" Landscape', width: 1194, height: 834, category: 'tablet', orientation: 'landscape' },
  { name: 'iPad Pro 12.9" Portrait', width: 1024, height: 1366, category: 'tablet', orientation: 'portrait' },
  { name: 'iPad Pro 12.9" Landscape', width: 1366, height: 1024, category: 'tablet', orientation: 'landscape' },
  
  // Desktop
  { name: 'MacBook Air 13"', width: 1440, height: 900, category: 'desktop', orientation: 'landscape' },
  { name: 'MacBook Pro 16"', width: 1728, height: 1117, category: 'desktop', orientation: 'landscape' },
  { name: 'iMac 24"', width: 2560, height: 1440, category: 'desktop', orientation: 'landscape' },
];

const MOBILE_BREAKPOINT = 1024;

const getCategoryIcon = (category: DeviceConfig['category']) => {
  switch (category) {
    case 'phone':
    case 'foldable':
      return <Smartphone size={14} />;
    case 'tablet':
      return <Tablet size={14} />;
    case 'desktop':
      return <Monitor size={14} />;
  }
};

const DeviceTestMatrix = () => {
  const navigate = useNavigate();
  const [testPath, setTestPath] = useState('/');
  const [selectedCategory, setSelectedCategory] = useState<DeviceConfig['category'] | 'all'>('all');
  const [scale, setScale] = useState(0.2);

  const filteredDevices = selectedCategory === 'all' 
    ? DEVICES 
    : DEVICES.filter(d => d.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="max-w-[1800px] mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold">Device Testing Matrix</h1>
            <span className="text-sm text-muted-foreground">
              Mobile breakpoint: {`<`}{MOBILE_BREAKPOINT}px
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* Path input */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Test Path:</label>
              <input
                type="text"
                value={testPath}
                onChange={(e) => setTestPath(e.target.value)}
                className="px-3 py-1.5 bg-muted rounded-lg text-sm w-48 border border-border focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="/"
              />
            </div>

            {/* Category filter */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Category:</label>
              <div className="flex gap-1">
                {(['all', 'phone', 'foldable', 'tablet', 'desktop'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm capitalize transition-colors',
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale control */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground">Scale:</label>
              <input
                type="range"
                min="0.1"
                max="0.5"
                step="0.05"
                value={scale}
                onChange={(e) => setScale(parseFloat(e.target.value))}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground w-12">{Math.round(scale * 100)}%</span>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              title="Refresh all previews"
            >
              <RotateCcw size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Device Grid */}
      <div className="p-6 max-w-[1800px] mx-auto">
        <div className="grid gap-6" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${Math.max(200, DEVICES[0].width * scale + 40)}px, 1fr))` }}>
          {filteredDevices.map((device) => {
            const isMobileLayout = device.width < MOBILE_BREAKPOINT;
            
            return (
              <div
                key={`${device.name}-${device.width}x${device.height}`}
                className="bg-card rounded-xl border border-border overflow-hidden"
              >
                {/* Device info header */}
                <div className="px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2 mb-1">
                    {getCategoryIcon(device.category)}
                    <span className="font-medium text-sm">{device.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{device.width} × {device.height}</span>
                    <span className="text-muted-foreground/50">•</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-medium',
                        isMobileLayout
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-green-500/20 text-green-400'
                      )}
                    >
                      {isMobileLayout ? 'Mobile Nav' : 'Desktop Nav'}
                    </span>
                    {device.orientation === 'landscape' && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <Maximize2 size={10} className="rotate-45" />
                      </>
                    )}
                  </div>
                </div>

                {/* Device frame */}
                <div className="p-3 flex justify-center items-start bg-black/20">
                  <div
                    className="bg-black rounded-lg overflow-hidden border-4 border-neutral-800 shadow-xl"
                    style={{
                      width: device.width * scale,
                      height: device.height * scale,
                    }}
                  >
                    <iframe
                      src={testPath}
                      title={device.name}
                      style={{
                        width: device.width,
                        height: device.height,
                        transform: `scale(${scale})`,
                        transformOrigin: 'top left',
                        border: 'none',
                      }}
                      sandbox="allow-scripts allow-same-origin"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-8 p-4 bg-card rounded-xl border border-border">
          <h2 className="font-semibold mb-3">Layout Rules</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium shrink-0">
                Mobile Nav
              </span>
              <span className="text-muted-foreground">
                Width {`<`} {MOBILE_BREAKPOINT}px → Bottom tab bar, swipe gestures, iOS-style navigation
              </span>
            </div>
            <div className="flex items-start gap-3">
              <span className="px-2 py-1 rounded bg-green-500/20 text-green-400 text-xs font-medium shrink-0">
                Desktop Nav
              </span>
              <span className="text-muted-foreground">
                Width ≥ {MOBILE_BREAKPOINT}px → Sidebar navigation, larger touch targets, extended layouts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeviceTestMatrix;
