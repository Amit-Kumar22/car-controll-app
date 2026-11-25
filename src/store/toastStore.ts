import { create } from 'zustand';
import { TOAST_DURATION_MS } from '../config';

export type ToastKind = 'info' | 'success' | 'error';

interface ToastState {
  id: number;
  message: string | null;
  kind: ToastKind;
  show(message: string, kind?: ToastKind): void;
  hide(): void;
}

let timer: ReturnType<typeof setTimeout> | undefined;

export const useToastStore = create<ToastState>()((set, get) => ({
  id: 0,
  message: null,
  kind: 'info',
  show(message, kind = 'info') {
    if (timer) clearTimeout(timer);
    set({ message, kind, id: get().id + 1 });
    timer = setTimeout(() => set({ message: null }), TOAST_DURATION_MS);
  },
  hide() {
    if (timer) clearTimeout(timer);
    set({ message: null });
  },
}));

export const showToast = (message: string, kind?: ToastKind) =>
  useToastStore.getState().show(message, kind);
