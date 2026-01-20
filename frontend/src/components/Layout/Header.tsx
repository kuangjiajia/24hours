interface HeaderProps {
  isConnected: boolean;
}

export function Header({ isConnected }: HeaderProps) {
  return (
    <header className="h-16 bg-bone border-b-2 border-void/10 px-8 flex items-center justify-end">
      {/* System Status */}
      <div className="flex items-center gap-2">
        <span
          className={`w-2.5 h-2.5 rounded-full animate-pulse ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`}
        />
        <span className="font-body text-sm font-medium">
          {isConnected ? 'System Online' : 'Disconnected'}
        </span>
      </div>
    </header>
  );
}
