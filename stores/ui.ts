// Zustand store cho UI state (modal, notify, ...)
import { create } from 'zustand';

type UIState = {
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  modalOpen: false,
  setModalOpen: (open) => set({ modalOpen: open }),
}));
