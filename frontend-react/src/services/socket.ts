import { io, type Socket } from 'socket.io-client';
import type {
  WeightEvent,
  PrintConfirmPayload,
  MOConfirmedPayload,
  MOCompletedPayload,
  PrintLotData,
} from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Typed Socket.IO interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  /** Generic status update (may include .scale field) */
  'serial-status':       (data: { scale?: string; connected: boolean }) => void;
  'serial-status:small': (data: { connected: boolean }) => void;
  'serial-status:large': (data: { connected: boolean }) => void;
  'weightData':          (data: WeightEvent) => void;
  /** Backend responds with MO details after 'mo-confirmed' */
  'mo-data-confirm':     (data: { success: boolean; data?: MODataResponse; error?: string }) => void;
  /** Backend ack after print-confirm insert */
  'print-confirm-ack':   (data: PrintConfirmAck) => void;
  /** Backend sends lot print data after print-lot request */
  'print-lot-data':      (data: { success: boolean; data?: PrintLotData; error?: string }) => void;
}

export interface MODataResponse {
  mo_id:           string;
  nomor_mo:        string;
  qty_plan:        number;
  total_rm:        number;
  produk_rm_items: string[];
  produk_rm_qty:   number[];
  produk_rm_kategori: string[];
  target_weights:  string[];
  lot?:            number;
  /** RM index to resume from (for duplicate MOs) */
  current_rm?:     number;
}

/** Response from server after print-confirm */
export interface PrintConfirmAck {
  success:  boolean;
  mo:       string;
  lot:      number;
  rm_index: number;
  error?:   string;
}

export interface ClientToServerEvents {
  'mo-confirmed': (payload: MOConfirmedPayload) => void;
  'print-confirm': (payload: PrintConfirmPayload) => void;
  'print-lot':    (payload: { mo: string; lot: number; timestamp: string }) => void;
  'mo-completed':  (payload: MOCompletedPayload) => void;
}

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

// ─────────────────────────────────────────────────────────────────────────────
// Singleton service
// ─────────────────────────────────────────────────────────────────────────────

class SocketService {
  private _socket: AppSocket | null = null;

  /**
   * Connect (or reuse existing connection).
   * In dev, Vite proxy forwards /socket.io → backend:3000.
   * In production, serve both from the same origin.
   */
  connect(url?: string): AppSocket {
    if (this._socket?.connected) return this._socket;

    this._socket = io(url ?? window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay:    2000,
    }) as AppSocket;

    return this._socket;
  }

  get socket(): AppSocket | null {
    return this._socket;
  }

  /** Emit a typed event — no-op if not yet connected */
  emit<K extends keyof ClientToServerEvents>(
    event: K,
    payload: Parameters<ClientToServerEvents[K]>[0],
  ): void {
    // Cast necessary because socket.io-client's generic emit expects rest args
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (this._socket as any)?.emit(event, payload);
  }

  disconnect(): void {
    this._socket?.disconnect();
    this._socket = null;
  }
}

export const socketService = new SocketService();
