export default function BuildBadge() {
  return (
    <div className="fixed bottom-2 right-3 text-[10px] text-muted-foreground opacity-60 select-none z-50 pointer-events-none">
      v{import.meta.env.VITE_BUILD_ID ?? 'dev'} · {import.meta.env.MODE}
    </div>
  );
}
