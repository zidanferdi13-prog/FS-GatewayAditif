import { Moon, Scale, Sun, FileText } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useClock } from '@/hooks/useClock';
import { useMOStore } from '@/store/moStore';
import { useScaleStore } from '@/store/scaleStore';
import { useUIStore } from '@/store/uiStore';
import { ConnectionChip } from '@/components/scale/ConnectionChip';
import { LotCounter } from '@/components/dashboard/LotCounter';
import { cn } from '@/utils/cn';

export function AppHeader() {
  const clock       = useClock();
  const location    = useLocation();
  const navigate    = useNavigate();
  const activeMO    = useMOStore((s) => s.activeMO);
  const small       = useScaleStore((s) => s.small);
  const large       = useScaleStore((s) => s.large);
  const openModal   = useUIStore((s) => s.openModal);
  const theme       = useUIStore((s) => s.theme);
  const toggleTheme = useUIStore((s) => s.toggleTheme);

  const isLaporan = location.pathname === '/laporan';

  const handleMOClick = () => {
    if (activeMO) {
      openModal('confirmReset');
    } else {
      openModal('moInput');
    }
  };

  const themeLabel = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <header className="app-header h-14 px-6 flex items-center justify-between gap-4 border-b border-b-card bg-bg-surface z-10 shrink-0">

      {/* ── Brand ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">
        <Scale
          className="text-c-blue drop-shadow-[0_0_8px_var(--c-blue)]"
          size={22}
          strokeWidth={2.2}
        />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold text-t-primary">AMA Timbangan</span>
          <span className="text-[10px] font-medium text-t-secondary uppercase tracking-[0.9px]">
            Aditif Monitor
          </span>
        </div>
      </div>

      {/* ── Centre: Nav + MO Button + Lot Counter ───────────────────────────── */}
      <div className="flex items-center justify-center gap-2 flex-1">
        {/* Laporan nav link */}
        <button
          onClick={() => navigate('/laporan')}
          className={cn(
            'inline-flex items-center gap-1 px-3 py-1.5 rounded-pill border-[1.5px]',
            'font-ui text-[12px] font-bold tracking-[0.4px] cursor-pointer',
            'transition-all duration-200 whitespace-nowrap',
            isLaporan
              ? 'text-c-blue border-c-blue bg-c-blue-dim'
              : 'text-t-secondary border-b-card bg-bg-elevated hover:border-c-blue hover:text-c-blue',
          )}
        >
          <FileText size={14} />
          Laporan
        </button>

        <button
          onClick={handleMOClick}
          className={cn(
            'inline-flex items-center gap-1 px-4 py-1.5 rounded-pill border-[1.5px]',
            'font-ui text-[13px] font-bold tracking-[0.4px] cursor-pointer',
            'transition-all duration-200 whitespace-nowrap',
            activeMO
              ? 'text-c-green border-c-green bg-c-green-dim hover:bg-c-green hover:text-white hover:shadow-glow-green'
              : 'text-c-red border-c-red bg-c-red-dim hover:bg-c-red hover:text-white hover:shadow-glow-red',
          )}
        >
          <span className="text-sm">📋</span>
          <span>{activeMO ?? 'INPUT MO'}</span>
        </button>

        <LotCounter />
      </div>

      {/* ── Right: Connection chips + Clock ───────────────────────────────── */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex gap-2">
          <ConnectionChip label="S1" connected={small.connected} />
          <ConnectionChip label="S2" connected={large.connected} />
        </div>

        <button
          type="button"
          onClick={toggleTheme}
          aria-label={themeLabel}
          title={themeLabel}
          className={cn(
            'inline-flex h-8 w-8 items-center justify-center rounded-pill border border-b-card',
            'bg-bg-elevated text-t-secondary transition-all duration-200',
            'hover:border-c-blue hover:bg-c-blue-dim hover:text-c-blue',
          )}
        >
          {theme === 'dark' ? <Sun size={16} strokeWidth={2.4} /> : <Moon size={16} strokeWidth={2.4} />}
        </button>

        <span className="font-mono text-sm font-semibold text-t-secondary tracking-[1.5px] min-w-[68px] text-right">
          {clock}
        </span>
      </div>
    </header>
  );
}
