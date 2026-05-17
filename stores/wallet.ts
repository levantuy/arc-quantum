// Zustand store cho trạng thái ví
import { create } from 'zustand';
import { Address } from '../types';

type WalletState = {
  address: Address | null;
  connected: boolean;
  setAddress: (address: Address | null) => void;
  setConnected: (connected: boolean) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  address: null,
  connected: false,
  setAddress: (address) => set({ address }),
  setConnected: (connected) => set({ connected }),
}));
