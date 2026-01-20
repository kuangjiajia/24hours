import type { Stats, FilterStatus } from '../../types';

interface StatusCardsBentoProps {
  stats: Stats;
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}

interface CardConfig {
  key: FilterStatus;
  label: string;
  sublabel: string;
  bgColor: string;
  textColor: string;
  accentColor: string;
}

export function StatusCardsBento({
  stats,
  activeFilter,
  onFilterChange,
}: StatusCardsBentoProps) {
  const totalTasks =
    stats.todo + stats.inProgress + stats.inReview + stats.done + stats.failed;

  const cards: CardConfig[] = [
    {
      key: 'all',
      label: 'ALL TASKS',
      sublabel: 'Total',
      bgColor: 'bg-void',
      textColor: 'text-white',
      accentColor: 'bg-genz-yellow',
    },
    {
      key: 'todo',
      label: 'TODO',
      sublabel: 'Pending',
      bgColor: 'bg-light-gray',
      textColor: 'text-void',
      accentColor: 'bg-blue-500',
    },
    {
      key: 'inProgress',
      label: 'IN PROGRESSING',
      sublabel: 'Active',
      bgColor: 'bg-genz-yellow',
      textColor: 'text-void',
      accentColor: 'bg-void',
    },
    {
      key: 'inReview',
      label: 'IN REVIEW',
      sublabel: 'Waiting',
      bgColor: 'bg-light-gray',
      textColor: 'text-void',
      accentColor: 'bg-orange-500',
    },
    {
      key: 'failed',
      label: 'FAILED',
      sublabel: 'Errors',
      bgColor: 'bg-red-500',
      textColor: 'text-white',
      accentColor: 'bg-white',
    },
    {
      key: 'done',
      label: 'DONE',
      sublabel: 'Completed',
      bgColor: 'bg-green-500',
      textColor: 'text-white',
      accentColor: 'bg-white',
    },
  ];

  const getCount = (key: FilterStatus): number => {
    if (key === 'all') return totalTasks;
    return stats[key] ?? 0;
  };

  return (
    <div className="grid grid-cols-6 gap-4">
      {cards.map((card, index) => {
        const isActive = activeFilter === card.key;
        const count = getCount(card.key);

        return (
          <button
            key={card.key}
            onClick={() => onFilterChange(card.key)}
            style={{ animationDelay: `${index * 60}ms` }}
            className={`
              ${card.bgColor} ${card.textColor}
              rounded-bento p-5 text-left
              bento-card cursor-pointer animate-fade-up
              ${isActive ? 'ring-4 ring-void ring-offset-2 ring-offset-bone' : ''}
              relative overflow-hidden
            `}
          >
            {/* Accent dot */}
            <div
              className={`absolute top-4 right-4 w-3 h-3 rounded-full ${card.accentColor}`}
            />

            {/* Content */}
            <div className="relative z-10">
              <div className="font-display text-3xl mb-2">{count}</div>
              <div className="font-heading text-sm tracking-wider uppercase">
                {card.label}
              </div>
              <div className="font-body text-xs opacity-60 mt-1">
                {card.sublabel}
              </div>
            </div>

            {/* Background decoration */}
            {isActive && (
              <div className="absolute -bottom-4 -right-4 w-16 h-16 rounded-full bg-white/10" />
            )}
          </button>
        );
      })}
    </div>
  );
}
