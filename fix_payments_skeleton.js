import fs from 'fs';

const file = 'src/components/mobile/MobileTripPayments.tsx';
if (fs.existsSync(file)) {
  let content = fs.readFileSync(file, 'utf8');

  const oldLoading = `  if (isLoading || demoLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
        <span className="text-sm text-muted-foreground">Loading payments...</span>
      </div>
    );
  }`;

  const newLoading = `  if (isLoading || demoLoading) {
    return (
      <div className="flex flex-col h-full bg-black px-4 pt-4 pb-2 space-y-4">
        {/* Balance Card Skeleton */}
        <div className="bg-card/50 border border-border rounded-xl p-4 animate-pulse">
          <div className="grid grid-cols-3 gap-3">
            <div className="h-12 bg-white/5 rounded-lg"></div>
            <div className="h-12 bg-white/5 rounded-lg"></div>
            <div className="h-12 bg-white/5 rounded-lg"></div>
          </div>
        </div>

        {/* Payments List Skeleton */}
        <div className="space-y-3">
          <div className="h-5 w-32 bg-white/5 rounded mt-2 mb-3"></div>
          <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
          <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
          <div className="h-20 bg-white/5 rounded-xl border border-white/5"></div>
        </div>
      </div>
    );
  }`;

  content = content.replace(oldLoading, newLoading);
  fs.writeFileSync(file, content);
}
