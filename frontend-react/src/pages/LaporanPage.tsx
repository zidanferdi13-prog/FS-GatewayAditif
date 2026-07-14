import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type MOListItem, type MODetail, type RMDetailItem } from '@/services/api';
import { cn } from '@/utils/cn';
import { ModalOverlay } from '@/components/modal/ModalOverlay';
import { FileText, ArrowLeft, Printer, Loader2, Search, X, CheckCircle2, AlertCircle } from 'lucide-react';

type SortKey = 'nomor_mo' | 'nama_produk' | 'status' | 'created_at';

/** A single lot with its material breakdown */
interface LotView {
  number:    number;
  materials: RMDetailItem[];
  totalWeight: number;
  totalRecorded: number;
  printed:   boolean;
}

export function LaporanPage() {
  const nav = useNavigate();

  // ── List state ──────────────────────────────────────────────────────────────
  const [list, setList]       = useState<MOListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortAsc, setSortAsc] = useState(false);

  // ── Detail state ────────────────────────────────────────────────────────────
  const [detailMO, setDetailMO]       = useState<MODetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen]   = useState(false);

  // ── Reprint state ───────────────────────────────────────────────────────────
  const [reprinting, setReprinting] = useState<number | null>(null);
  const [reprintMsg, setReprintMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Computed lots ───────────────────────────────────────────────────────────
  const lots: LotView[] = detailMO
    ? Array.from({ length: detailMO.qty_plan }, (_, i) => {
        const number = i + 1;
        const totalWeight = detailMO.rm_details.reduce((s, rm) => s + rm.target_weight, 0);
        const totalRecorded = detailMO.rm_details.reduce((s, rm) => {
          const latest = rm.weights[0]?.actual_weight ?? 0;
          return s + latest;
        }, 0);
        const printed = detailMO.rm_details.some(rm => rm.weights.length > 0);
        return { number, materials: detailMO.rm_details, totalWeight, totalRecorded, printed };
      })
    : [];

  // ── Fetch list ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    setError(null);
    api.listMO()
      .then(setList)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Open detail ────────────────────────────────────────────────────────────
  const openDetail = async (mo: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailMO(null);
    setReprintMsg(null);
    try {
      const d = await api.getMODetail(mo);
      setDetailMO(d);
    } catch {
      setDetailMO(null);
    } finally {
      setDetailLoading(false);
    }
  };

  // ── Reprint lot ────────────────────────────────────────────────────────────
  const handleReprintLot = async (lot: number) => {
    if (!detailMO) return;
    setReprinting(lot);
    setReprintMsg(null);
    try {
      const res = await api.reprintLot(detailMO.nomor_mo, lot);
      setReprintMsg({ ok: true, text: `Print ulang Lot ${lot} — ${res.count} RM dikirim` });
    } catch {
      setReprintMsg({ ok: false, text: `Gagal print ulang Lot ${lot}` });
    } finally {
      setReprinting(null);
    }
  };

  // ── Sort / filter ──────────────────────────────────────────────────────────
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc((a) => !a);
    else { setSortKey(k); setSortAsc(false); }
  };

  const filtered = list
    .filter((m) =>
      !search || m.nomor_mo.toLowerCase().includes(search.toLowerCase()) ||
      (m.nama_produk ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === 'created_at') return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const va = (a[sortKey] ?? '').toString().toLowerCase();
      const vb = (b[sortKey] ?? '').toString().toLowerCase();
      return dir * va.localeCompare(vb);
    });

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full flex flex-col overflow-hidden bg-bg-base">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-3 px-6 py-3 border-b border-b-card bg-bg-surface">
        <button
          onClick={() => nav('/')}
          className="flex items-center gap-1.5 text-t-secondary hover:text-t-primary transition-colors"
        >
          <ArrowLeft size={18} />
          <span className="text-sm font-medium">Dashboard</span>
        </button>
        <div className="h-4 w-px bg-b-card" />
        <FileText size={18} className="text-c-blue" />
        <h1 className="text-base font-bold text-t-primary">Laporan MO</h1>
        <div className="flex-1" />
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-t-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari MO atau produk..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-bg-elevated border border-b-card text-t-primary text-xs
                       placeholder:text-t-muted outline-none focus:border-c-blue transition-colors"
          />
        </div>
      </div>

      {/* ── List table ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-t-secondary gap-2">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Memuat data...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <span className="text-sm text-c-red">{error}</span>
            <button onClick={() => window.location.reload()} className="text-xs text-c-blue underline">Coba lagi</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-t-muted text-sm">
            {search ? 'Tidak ada MO cocok dengan pencarian' : 'Belum ada data MO'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-t-muted text-xs uppercase tracking-wider border-b border-b-card">
                <Th sortKey="nomor_mo" current={sortKey} asc={sortAsc} onSort={toggleSort}>Nomor MO</Th>
                <Th sortKey="nama_produk" current={sortKey} asc={sortAsc} onSort={toggleSort}>Produk</Th>
                <Th sortKey="status" current={sortKey} asc={sortAsc} onSort={toggleSort}>Status</Th>
                <Th className="text-right">Lot</Th>
                <Th className="text-right">RM</Th>
                <Th sortKey="created_at" current={sortKey} asc={sortAsc} onSort={toggleSort}>Dibuat</Th>
                <Th className="text-right">Aksi</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((mo) => (
                <tr key={mo.id} className="border-b border-b-card hover:bg-bg-surface/60 transition-colors">
                  <td className="py-2.5 px-2 font-mono text-sm font-semibold text-t-primary">{mo.nomor_mo}</td>
                  <td className="py-2.5 px-2 text-t-secondary max-w-[220px] truncate">{mo.nama_produk ?? '—'}</td>
                  <td className="py-2.5 px-2">
                    <StatusBadge status={mo.status} />
                  </td>
                  <td className="py-2.5 px-2 text-right text-t-secondary font-mono">{mo.qty_plan}</td>
                  <td className="py-2.5 px-2 text-right text-t-secondary font-mono">{mo.total_rm}</td>
                  <td className="py-2.5 px-2 text-t-muted text-xs whitespace-nowrap">
                    {new Date(mo.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      onClick={() => openDetail(mo.nomor_mo)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-pill text-xs font-medium
                                 bg-c-blue-dim text-c-blue hover:bg-c-blue hover:text-white transition-all"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Detail Modal ────────────────────────────────────────────────────── */}
      <ModalOverlay isOpen={detailOpen} onClose={() => { setDetailOpen(false); setReprintMsg(null); }}>
        <div className="dialog min-w-[620px] max-w-[780px] max-h-[85vh] flex flex-col">
          {/* ── Header ──────────────────────────────────────────────────────── */}
          <div className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-b-card">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-c-blue" />
              <h2 className="text-sm font-bold text-t-primary">
                {detailMO ? `Detail ${detailMO.nomor_mo}` : 'Detail MO'}
              </h2>
            </div>
            <button onClick={() => { setDetailOpen(false); setReprintMsg(null); }}
                    className="text-t-muted hover:text-t-primary transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* ── Body ────────────────────────────────────────────────────────── */}
          <div className="overflow-auto p-5 space-y-4">
            {detailLoading ? (
              <div className="flex items-center justify-center h-32 text-t-secondary gap-2">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Memuat detail...</span>
              </div>
            ) : detailMO ? (
              <>
                {/* Info MO */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                  <InfoRow label="Nomor MO" value={detailMO.nomor_mo} />
                  <InfoRow label="Produk" value={detailMO.nama_produk ?? '—'} />
                  <InfoRow label="Work Center" value={detailMO.work_center ?? '—'} />
                  <InfoRow label="Status" value={<StatusBadge status={detailMO.status} />} />
                  <InfoRow label="Jadwal" value={detailMO.schedule_mo ? new Date(detailMO.schedule_mo).toLocaleDateString('id-ID') : '—'} />
                  <InfoRow label="Total Lot" value={String(detailMO.qty_plan)} />
                  <InfoRow label="Dibuat" value={new Date(detailMO.created_at).toLocaleString('id-ID')} />
                </div>

                {/* Reprint message */}
                {reprintMsg && (
                  <div className={cn(
                    'text-xs px-3 py-1.5 rounded-lg',
                    reprintMsg.ok ? 'bg-c-green-dim text-c-green' : 'bg-c-red-dim text-c-red',
                  )}>
                    {reprintMsg.text}
                  </div>
                )}

                {/* Per-lot table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold text-t-primary uppercase tracking-wider">
                      Daftar Lot & Material
                    </h3>
                    <span className="text-[10px] text-t-muted font-mono">
                      {detailMO.rm_details.length} RM per lot
                    </span>
                  </div>

                  <div className="space-y-2">
                    {lots.map((lot) => (
                      <div key={lot.number}
                        className="rounded-xl border border-b-card bg-bg-surface/30 overflow-hidden">
                        {/* Lot header */}
                        <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated/50">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-lg text-[10px] font-extrabold',
                              lot.printed
                                ? 'bg-c-green-dim text-c-green'
                                : 'bg-c-blue-dim text-c-blue',
                            )}>
                              {lot.number}
                            </span>
                            <span className="text-xs font-bold text-t-primary">Lot {lot.number}</span>
                            {lot.printed && (
                              <span className="flex items-center gap-1 text-[10px] text-c-green">
                                <CheckCircle2 size={11} />
                                Sudah ditimbang
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-[10px] text-t-muted">
                              <span className="font-mono text-t-secondary font-semibold">{lot.totalWeight.toFixed(2)}</span> kg total
                            </div>
                            <button
                              onClick={() => handleReprintLot(lot.number)}
                              disabled={reprinting === lot.number}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-pill text-[11px] font-bold
                                         bg-c-blue-dim text-c-blue border border-c-blue/30
                                         hover:bg-c-blue hover:text-white transition-all
                                         disabled:opacity-40"
                            >
                              {reprinting === lot.number ? (
                                <Loader2 size={13} className="animate-spin" />
                              ) : (
                                <Printer size={13} />
                              )}
                              Cetak Lot
                            </button>
                          </div>
                        </div>

                        {/* Lot RM table */}
                        <table className="w-full text-[11px]">
                          <thead>
                            <tr className="text-t-muted uppercase tracking-wider border-t border-b-card">
                              <th className="text-left py-1.5 px-4 font-semibold">Material</th>
                              <th className="text-right py-1.5 px-2 font-semibold">Qty</th>
                              <th className="text-right py-1.5 px-2 font-semibold">Target (kg)</th>
                              <th className="text-right py-1.5 px-3 font-semibold">Aktual (kg)</th>
                              <th className="text-right py-1.5 px-2 font-semibold">Scale</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lot.materials.map((rm, idx) => {
                              const latestW = rm.weights[0]?.actual_weight;
                              return (
                                <tr key={rm.id} className="border-t border-b-card/40">
                                  <td className="py-1.5 pr-2 pl-4 text-t-primary font-medium">
                                    <span className={cn(
                                      'inline-flex items-center justify-center w-3.5 h-3.5 rounded text-[8px] font-bold mr-1.5',
                                      rm.target_weight > 5
                                        ? 'bg-c-purple-dim text-c-purple'
                                        : 'bg-c-blue-dim text-c-blue',
                                    )}>{idx + 1}</span>
                                    {rm.item}
                                  </td>
                                  <td className="py-1.5 px-2 text-right text-t-secondary font-mono">{rm.qty}</td>
                                  <td className="py-1.5 px-2 text-right text-t-secondary font-mono">{rm.target_weight.toFixed(2)}</td>
                                  <td className="py-1.5 px-3 text-right font-mono">
                                    {latestW !== undefined ? (
                                      <span className={cn(
                                        Math.abs(latestW - rm.target_weight) / rm.target_weight <= 0.02
                                          ? 'text-c-green' : 'text-c-amber'
                                      )}>
                                        {latestW.toFixed(2)}
                                      </span>
                                    ) : (
                                      <span className="text-t-muted">—</span>
                                    )}
                                  </td>
                                  <td className="py-1.5 px-2 text-right">
                                    <ScaleBadge type={rm.target_weight > 20 ? 'large' : 'small'} />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-c-red text-center py-8">Gagal memuat detail MO</div>
            )}
          </div>
        </div>
      </ModalOverlay>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

interface ThProps {
  children: React.ReactNode;
  sortKey?: SortKey;
  current?: SortKey;
  asc?: boolean;
  onSort?: (k: SortKey) => void;
  className?: string;
}

function Th({ children, sortKey, current, asc, onSort, className }: ThProps) {
  const active = sortKey && sortKey === current;
  const Comp = sortKey ? 'button' : 'span';
  return (
    <th className={cn('py-2 px-2 font-semibold whitespace-nowrap', className)}>
      <Comp
        {...(sortKey ? { onClick: () => onSort!(sortKey) } : {})}
        className={cn(
          'inline-flex items-center gap-1',
          sortKey && 'hover:text-t-primary transition-colors cursor-pointer',
          active ? 'text-t-primary' : 'text-t-muted',
        )}
      >
        {children}
        {sortKey && (
          <span className="text-[9px] leading-none">{active ? (asc ? '▲' : '▼') : '▾'}</span>
        )}
      </Comp>
    </th>
  );
}

function StatusBadge({ status }: { status: string }) {
  const isActive = status === 'active' || status === 'running';
  return (
    <span className={cn(
      'badge text-[9px]',
      isActive ? 'bg-c-green-dim text-c-green' : 'bg-bg-elevated text-t-muted',
    )}>
      {status === 'active' ? 'Running' : status}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-t-muted min-w-[80px]">{label}</span>
      <span className="text-t-primary font-medium">{value}</span>
    </div>
  );
}

function ScaleBadge({ type }: { type: string }) {
  return (
    <span className={cn(
      'inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider',
      type === 'large'
        ? 'bg-c-purple-dim text-c-purple'
        : 'bg-c-blue-dim text-c-blue',
    )}>
      {type === 'large' ? 'L' : 'S'}
    </span>
  );
}
