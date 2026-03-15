interface TabBarProps {
  tabs: string[];
  active: number;
  onTabChange: (index: number) => void;
}

export function TabBar({ tabs, active, onTabChange }: TabBarProps) {
  return (
    <div class="sticky top-0 z-10 -mx-3 mb-3 overflow-x-auto bg-slate-800 px-2 shadow-sm"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <div class="flex min-w-max">
        {tabs.map((tab, i) => (
          <button
            key={tab}
            onClick={() => onTabChange(i)}
            class={`whitespace-nowrap px-4 py-2.5 text-xs font-medium transition-colors ${
              i === active
                ? 'border-b-2 border-white text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}
