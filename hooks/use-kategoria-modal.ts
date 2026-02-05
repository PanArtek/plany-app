'use client'

import { useState, useCallback } from 'react';
import { getNextKod } from '@/actions/kategorie';
import type { KategoriaNode } from '@/actions/kategorie';

export interface KategoriaModalState {
  open: boolean;
  mode: 'add' | 'edit';
  poziom: 1 | 2 | 3;
  parentId: string | null;
  parentPath: string | null;
  parentNazwa: string | null;
  suggestedKod: string | null;
  kategoria?: KategoriaNode;
  isLoading: boolean;
}

const initialState: KategoriaModalState = {
  open: false,
  mode: 'add',
  poziom: 2,
  parentId: null,
  parentPath: null,
  parentNazwa: null,
  suggestedKod: null,
  isLoading: false,
};

export function useKategoriaModal() {
  const [state, setState] = useState<KategoriaModalState>(initialState);

  const openAdd = useCallback(async (
    parentId: string | null,
    parentKod: string | null,
    parentNazwa: string | null,
    poziom: 1 | 2 | 3
  ) => {
    setState({
      open: true,
      mode: 'add',
      poziom,
      parentId,
      parentPath: parentKod,
      parentNazwa,
      suggestedKod: null,
      isLoading: true,
    });

    const suggestedKod = await getNextKod(parentId);

    setState(prev => ({
      ...prev,
      suggestedKod,
      isLoading: false,
    }));
  }, []);

  const openEdit = useCallback((
    kategoria: KategoriaNode,
    parentKod: string | null,
    parentNazwa: string | null,
    poziom: 1 | 2 | 3
  ) => {
    setState({
      open: true,
      mode: 'edit',
      poziom,
      parentId: kategoria.parent_id,
      parentPath: parentKod,
      parentNazwa,
      suggestedKod: null,
      kategoria,
      isLoading: false,
    });
  }, []);

  const close = useCallback(() => {
    setState(initialState);
  }, []);

  const setOpen = useCallback((open: boolean) => {
    if (!open) {
      setState(initialState);
    }
  }, []);

  return { state, openAdd, openEdit, close, setOpen };
}
