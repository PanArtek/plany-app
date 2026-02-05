'use client'

import { useState, useCallback, useEffect } from 'react';
import { getKategorieByPoziom, getNextPozycjaKod, type KategoriaOption } from '@/actions/kategorie';

export interface PozycjaFormState {
  branzaId: string;
  kategoriaId: string;
  podkategoriaId: string;
  branze: KategoriaOption[];
  kategorie: KategoriaOption[];
  podkategorie: KategoriaOption[];
  suggestedKod: string;
  isLoadingKod: boolean;
}

const initialState: PozycjaFormState = {
  branzaId: '',
  kategoriaId: '',
  podkategoriaId: '',
  branze: [],
  kategorie: [],
  podkategorie: [],
  suggestedKod: '',
  isLoadingKod: false,
};

export function usePozycjaForm() {
  const [state, setState] = useState<PozycjaFormState>(initialState);

  // Fetch branze on mount
  useEffect(() => {
    const fetchBranze = async () => {
      const branze = await getKategorieByPoziom(1);
      setState(prev => ({ ...prev, branze }));
    };
    fetchBranze();
  }, []);

  const setBranza = useCallback(async (id: string) => {
    setState(prev => ({
      ...prev,
      branzaId: id,
      kategoriaId: '',
      podkategoriaId: '',
      kategorie: [],
      podkategorie: [],
      suggestedKod: '',
    }));

    if (id) {
      const kategorie = await getKategorieByPoziom(2, id);
      setState(prev => ({ ...prev, kategorie }));
    }
  }, []);

  const setKategoria = useCallback(async (id: string) => {
    setState(prev => ({
      ...prev,
      kategoriaId: id,
      podkategoriaId: '',
      podkategorie: [],
      suggestedKod: '',
    }));

    if (id) {
      const podkategorie = await getKategorieByPoziom(3, id);
      setState(prev => ({ ...prev, podkategorie }));
    }
  }, []);

  const setPodkategoria = useCallback(async (id: string) => {
    setState(prev => ({
      ...prev,
      podkategoriaId: id,
      suggestedKod: '',
      isLoadingKod: id !== '',
    }));

    if (id) {
      const suggestedKod = await getNextPozycjaKod(id);
      setState(prev => ({
        ...prev,
        suggestedKod,
        isLoadingKod: false,
      }));
    }
  }, []);

  const reset = useCallback(() => {
    setState(prev => ({
      ...initialState,
      branze: prev.branze, // Keep branze loaded
    }));
  }, []);

  return {
    state,
    setBranza,
    setKategoria,
    setPodkategoria,
    reset,
  };
}
