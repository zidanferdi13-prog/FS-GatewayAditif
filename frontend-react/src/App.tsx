import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { DashboardPage } from '@/pages/DashboardPage';
import { LaporanPage } from '@/pages/LaporanPage';
import { useUIStore } from '@/store/uiStore';
import { cn } from '@/utils/cn';

function AppShell({ children }: { children: React.ReactNode }) {
  const theme = useUIStore((s) => s.theme);
  return (
    <div className={cn('h-full', theme === 'light' && 'light')}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/laporan" element={<LaporanPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}
