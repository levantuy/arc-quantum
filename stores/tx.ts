// Zustand store cho trạng thái giao dịch
import { create } from 'zustand';
import { Transaction } from '../types';

type TxState = {
  transactions: Transaction[];
  addTx: (tx: Transaction) => void;
  setTxs: (txs: Transaction[]) => void;
};

export const useTxStore = create<TxState>((set) => ({
  transactions: [],
  addTx: (tx) => set((state) => ({ transactions: [tx, ...state.transactions] })),
  setTxs: (txs) => set({ transactions: txs }),
}));
