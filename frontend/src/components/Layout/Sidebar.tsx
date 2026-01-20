import type { NavItem } from '../../types';
import { SettingsPanel } from './SettingsPanel';

interface SidebarProps {
  activeNav: NavItem;
  onNavChange: (nav: NavItem) => void;
}

export function Sidebar({ activeNav, onNavChange }: SidebarProps) {
  const navItems: { key: NavItem; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'tasks', label: 'Task List' },
  ];

  return (
    <aside className="w-48 bg-void text-white h-screen p-6 flex flex-col overflow-y-auto">
      {/* Logo */}
      <div className="mb-10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-genz-yellow rounded-xl flex items-center justify-center">
            <span className="font-display text-void text-sm">24</span>
          </div>
          <span className="font-display text-lg">24hours</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-shrink-0">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.key}>
              <button
                onClick={() => onNavChange(item.key)}
                className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 flex items-center gap-3 ${
                  activeNav === item.key
                    ? 'bg-genz-yellow text-void font-bold'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="font-body">
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Spacer to push bottom content down */}
      <div className="flex-1" />

      {/* Bottom section - Settings and Version */}
      <div className="flex-shrink-0">
        {/* Settings Panel */}
        <div className="pt-6 border-t border-white/10">
          <SettingsPanel />
        </div>
      </div>
    </aside>
  );
}
