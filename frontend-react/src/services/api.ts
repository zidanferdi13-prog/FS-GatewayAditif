// ─────────────────────────────────────────────────────────────────────────────
// Minimal HTTP client for REST API calls
// ─────────────────────────────────────────────────────────────────────────────

const BASE = ''; // same origin — Vite proxy or Express serves both

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  const body: ApiResponse<T> = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? `Request failed (${res.status})`);
  }
  return body.data as T;
}

// ── MO ─────────────────────────────────────────────────────────────────────

export interface MOListItem {
  id:             string;
  nomor_mo:       string;
  nama_produk:    string | null;
  qty_plan:       number;
  total_rm:       number;
  status:         string;
  lot:            number;
  work_center:    string | null;
  schedule_mo:    string | null;
  created_at:     string;
  last_updated_at: string;
}

export interface RMDetailItem {
  id:            string;
  item:          string;
  qty:           number;
  target_weight: number;
  weights:       WeightRecord[];
}

export interface WeightRecord {
  id:            string;
  actual_weight: number;
  timestamp:     string;
}

export interface MODetail {
  id:            string;
  t_mo_id:       string | null;
  work_center:   string | null;
  nomor_mo:      string;
  nama_produk:   string | null;
  schedule_mo:   string | null;
  qty_plan:      number;
  lot:           number;
  total_rm:      number;
  status:        string;
  created_at:    string;
  rm_details:    RMDetailItem[];
}

export const api = {
  /** List all MOs (newest first) */
  listMO: (): Promise<MOListItem[]> =>
    request<MOListItem[]>('/mo'),

  /** Get full MO detail with RM + weight history */
  getMODetail: (nomor_mo: string): Promise<MODetail> =>
    request<MODetail>(`/mo/${encodeURIComponent(nomor_mo)}`),

  /** Re-trigger print for single RM */
  reprintRM: (payload: {
    mo: string;
    lot: number;
    rm_index: number;
    rm_name: string;
    scale_used: string;
    weight: number;
    target: number;
  }): Promise<void> =>
    request<void>('/mo/reprint', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  /** Re-print entire lot (all RM items) */
  reprintLot: (nomor_mo: string, lot: number): Promise<{ count: number }> =>
    request<{ count: number }>('/mo/reprint-lot', {
      method: 'POST',
      body: JSON.stringify({ mo: nomor_mo, lot }),
    }),
};
