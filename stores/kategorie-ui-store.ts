import { create } from 'zustand';

export type BranzaKod = 'BUD' | 'ELE' | 'SAN' | 'TEL' | 'HVC';

interface KategorieUIState {
  activeBranza: BranzaKod;
  expandedIds: Set<string>;

  setActiveBranza: (branza: BranzaKod) => void;
  toggleExpanded: (id: string) => void;
  collapseAll: () => void;
}

export const useKategorieUIStore = create<KategorieUIState>((set) => ({
  activeBranza: 'BUD',
  expandedIds: new Set(),

  setActiveBranza: (branza) => set({
    activeBranza: branza,
    expandedIds: new Set() // collapse all on tab change
  }),

  toggleExpanded: (id) => set((state) => {
    const newSet = new Set(state.expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    return { expandedIds: newSet };
  }),

  collapseAll: () => set({ expandedIds: new Set() }),
}));
