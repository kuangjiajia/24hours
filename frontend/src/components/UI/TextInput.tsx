import { Tooltip, InfoIcon } from './Tooltip';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'password';
  placeholder?: string;
  tooltip?: string;
  disabled?: boolean;
  variant?: 'dark' | 'light';
}

export function TextInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  tooltip,
  disabled = false,
  variant = 'light',
}: TextInputProps) {
  const isDark = variant === 'dark';

  return (
    <div className="space-y-2">
      <label className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${
        isDark ? 'text-white/60' : 'text-void/60'
      }`}>
        {label}
        {tooltip && (
          <Tooltip content={tooltip} position="top">
            <InfoIcon className={isDark ? 'text-white/40 hover:text-white/60' : 'text-void/40 hover:text-void/60'} />
          </Tooltip>
        )}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`
          w-full px-4 py-3
          border-2 rounded-xl
          font-body text-sm
          shadow-[0_1px_0_0_rgba(15,15,15,0.12)]
          transition-[border-color,box-shadow,background-color,transform] duration-200
          focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-genz-yellow/40 focus:ring-offset-2
          hover:shadow-[0_2px_0_0_rgba(15,15,15,0.18)]
          focus:shadow-[0_3px_0_0_rgba(15,15,15,0.22)]
          active:translate-y-[1px]
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isDark
            ? 'bg-white/10 text-white border-white/15 placeholder-white/30 shadow-[0_1px_0_0_rgba(255,255,255,0.08)] focus:border-genz-yellow focus:ring-offset-void focus:bg-white/15 enabled:hover:border-white/40'
            : 'bg-white text-void border-void/20 placeholder-void/40 focus:border-void focus:ring-offset-bone focus:bg-bone enabled:hover:border-void/40'
          }
        `}
      />
    </div>
  );
}
