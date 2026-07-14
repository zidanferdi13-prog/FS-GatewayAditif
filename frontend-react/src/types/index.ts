// ─────────────────────────────────────────────────────────────────────────────
// Core domain types for AMA Timbangan Aditif
// ─────────────────────────────────────────────────────────────────────────────

/** Which physical scale an item should be weighed on */
export type ScaleType = 'small' | 'large';

// ── Manufacturing Order ───────────────────────────────────────────────────────

/** Raw data returned by the backend when a MO is fetched */
export interface MOData {
  mo_id:           string;
  nomor_mo:        string;
  qty_plan:        number;
  total_rm:        number;
  produk_rm_items: string[];
  produk_rm_qty:   number[];
  target_weights:  string[];
  /** Lot offset to resume at (if MO was partially completed) */
  lot?: number;
  /** RM index to resume from (for duplicate MOs) */
  current_rm?: number;
}

/** Normalised material record derived from MOData */
export interface Material {
  name:         string;
  targetWeight: number;
  quantity:     number;
  scaleType:    ScaleType;
}

// ── Scale / Sensor ────────────────────────────────────────────────────────────

/** Real-time weight event payload from Socket.IO */
export interface WeightEvent {
  scale:     ScaleType;
  weight:    number;
  stable:    boolean;
  timestamp: string;
}

/** Connection/stability state for a single scale */
export interface SingleScaleState {
  weight:       number;
  stable:       boolean;
  connected:    boolean;
  lastUpdate:   string | null;
  overloadShown: boolean;
}

// ── Socket ────────────────────────────────────────────────────────────────────

export interface SocketStatus {
  connected: boolean;
}

/** Payload emitted to server when an RM is confirmed */
export interface PrintConfirmPayload {
  mo:         string;
  lot:        number;
  rm_index:   number;
  rm_name:    string;
  scale_used: ScaleType;
  weight:     number;
  target:     number;
  timestamp:  string;
}

/** Payload emitted to server when MO input is submitted */
export interface MOConfirmedPayload {
  mo:        string;
  timestamp: string;
}

/** Payload emitted to server when all lots are complete */
export interface MOCompletedPayload {
  mo:              string;
  lots_completed:  number;
  timestamp:       string;
}

/** Payload emitted to server when a lot is ready for printing */
export interface PrintLotPayload {
  mo:         string;
  lot:        number;
  timestamp:  string;
}

/** Print data returned by server for a completed lot */
export interface PrintLotData {
  mo:          string;
  lot:         number;
  nama_produk: string;
  items: Array<{
    rm_index:      number;
    rm_name:       string;
    target_weight: number;
    actual_weight: number | null;
  }>;
}

// ── UI ────────────────────────────────────────────────────────────────────────

export type ModalId =
  | 'moInput'
  | 'moConfirm'
  | 'confirmReset'
  | 'overload'
  | 'lotComplete'
  | 'completion';

export interface Toast {
  id:       string;
  type:     'success' | 'warning' | 'error' | 'info';
  title:    string;
  message?: string;
  /** ms — 0 means persistent */
  duration: number;
}

export type Theme = 'dark' | 'light';

// ── Progress state (derived from MO store, used in display) ──────────────────

export interface LotProgress {
  currentLot:   number;
  totalLot:     number;
  currentRM:    number;
  totalRM:      number;
}
