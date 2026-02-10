interface StatItem {
  label: string;
  value: string;
  sublabel?: string;
}

interface StatsBarProps {
  items: StatItem[];
}

export function StatsBar({ items }: StatsBarProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="bg-[#1A1A24]/40 backdrop-blur-sm border border-white/[0.06] rounded-lg px-4 py-3"
        >
          <div className="text-xs text-white/40 uppercase tracking-wider mb-1">
            {item.label}
          </div>
          <div className="text-lg font-mono font-semibold text-amber-500">
            {item.value}
          </div>
          {item.sublabel && (
            <div className="text-xs text-white/30 mt-0.5">{item.sublabel}</div>
          )}
        </div>
      ))}
    </div>
  );
}
