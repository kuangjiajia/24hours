import { useState } from 'react';
import type { Stats, StatusType } from '../../types';
import { TaskListModal } from './TaskListModal';

interface StatsCardsProps {
  stats: Stats;
}

interface CardConfig {
  key: StatusType;
  label: string;
  color: string;
  sublabel: string;
  statusName: string;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const [selectedStatus, setSelectedStatus] = useState<CardConfig | null>(null);

  const cards: CardConfig[] = [
    {
      key: 'todo',
      label: 'Pending',
      color: 'blue',
      sublabel: 'Todo',
      statusName: 'Todo',
    },
    {
      key: 'inProgress',
      label: 'Running',
      color: 'yellow',
      sublabel: 'In Progress',
      statusName: 'In Progress',
    },
    {
      key: 'inReview',
      label: 'Review',
      color: 'orange',
      sublabel: 'In Review',
      statusName: 'In Review',
    },
    {
      key: 'done',
      label: 'Completed',
      color: 'green',
      sublabel: 'Done',
      statusName: 'Done',
    },
    {
      key: 'failed',
      label: 'Failed',
      color: 'red',
      sublabel: 'Failed',
      statusName: 'Failed',
    },
  ];

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500/20 border-blue-500/50 text-blue-400 hover:bg-blue-500/30',
    yellow:
      'bg-yellow-500/20 border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/30',
    orange:
      'bg-orange-500/20 border-orange-500/50 text-orange-400 hover:bg-orange-500/30',
    green:
      'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30',
    red: 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30',
  };

  const getStatValue = (key: StatusType): number => {
    return stats[key] ?? 0;
  };

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((card) => (
          <div
            key={card.key}
            onClick={() => setSelectedStatus(card)}
            className={`rounded-lg border p-4 cursor-pointer transition-colors ${colorMap[card.color]}`}
          >
            <div className="text-3xl font-bold">{getStatValue(card.key)}</div>
            <div className="text-sm mt-1">{card.label}</div>
            <div className="text-xs opacity-60">{card.sublabel}</div>
          </div>
        ))}
      </div>

      {selectedStatus && (
        <TaskListModal
          status={selectedStatus.key}
          statusLabel={selectedStatus.label}
          statusName={selectedStatus.statusName}
          onClose={() => setSelectedStatus(null)}
        />
      )}
    </>
  );
}
