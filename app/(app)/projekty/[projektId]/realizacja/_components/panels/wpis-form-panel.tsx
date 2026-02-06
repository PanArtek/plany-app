'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import type { RealizacjaWpisRow } from '@/actions/realizacja';
import { createRealizacjaWpis, updateRealizacjaWpis } from '@/actions/realizacja';
import { WPIS_TYP_CONFIG, type RealizacjaWpisTyp } from '@/lib/realizacja/typ-config';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// Form schema without .default() for zodResolver compatibility
const formSchema = z.object({
  typ: z.enum(['material', 'robocizna', 'inny']),
  kwota_netto: z.number().positive('Kwota musi być większa od 0'),
  numer_faktury: z.string().max(100).optional().nullable(),
  data_faktury: z.string().optional().nullable(),
  opis: z.string().max(500).optional().nullable(),
  zamowienie_id: z.string().uuid().optional().nullable(),
  umowa_id: z.string().uuid().optional().nullable(),
  oplacone: z.boolean(),
});

type FormData = z.infer<typeof formSchema>;

interface WpisFormPanelProps {
  open: boolean;
  onClose: () => void;
  projektId: string;
  wpisId: string | null;
  wpisy: RealizacjaWpisRow[];
  zamowieniaList: { id: string; numer: string }[];
  umowyList: { id: string; numer: string }[];
}

export function WpisFormPanel({
  open,
  onClose,
  projektId,
  wpisId,
  wpisy,
  zamowieniaList,
  umowyList,
}: WpisFormPanelProps) {
  const isEdit = wpisId !== null;
  const existing = isEdit ? wpisy.find((w) => w.id === wpisId) : null;

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      typ: 'material',
      kwota_netto: 0,
      numer_faktury: null,
      data_faktury: null,
      opis: null,
      zamowienie_id: null,
      umowa_id: null,
      oplacone: false,
    },
  });

  // Powiązanie logic
  const zamowienieId = watch('zamowienie_id');
  const umowaId = watch('umowa_id');
  const powiazanieTyp = zamowienieId ? 'zamowienie' : umowaId ? 'umowa' : 'brak';

  useEffect(() => {
    if (open) {
      if (existing) {
        reset({
          typ: existing.typ as 'material' | 'robocizna' | 'inny',
          kwota_netto: existing.kwota_netto,
          numer_faktury: existing.numer_faktury,
          data_faktury: existing.data_faktury,
          opis: existing.opis,
          zamowienie_id: existing.zamowienie_id,
          umowa_id: existing.umowa_id,
          oplacone: existing.oplacone,
        });
      } else {
        reset({
          typ: 'material',
          kwota_netto: 0,
          numer_faktury: null,
          data_faktury: null,
          opis: null,
          zamowienie_id: null,
          umowa_id: null,
          oplacone: false,
        });
      }
    }
  }, [open, existing, reset]);

  const handlePowiazanieChange = (value: string) => {
    if (value === 'brak') {
      setValue('zamowienie_id', null);
      setValue('umowa_id', null);
    } else if (value === 'zamowienie') {
      setValue('umowa_id', null);
      // zamowienie_id will be set by the second select
    } else if (value === 'umowa') {
      setValue('zamowienie_id', null);
      // umowa_id will be set by the second select
    }
  };

  const onSubmit = async (data: FormData) => {
    const result = isEdit
      ? await updateRealizacjaWpis(wpisId!, projektId, data)
      : await createRealizacjaWpis(projektId, data);

    if (result.success) {
      toast.success(isEdit ? 'Wpis zaktualizowany' : 'Wpis dodany');
      onClose();
    } else {
      toast.error(result.error || 'Błąd zapisu');
    }
  };

  return (
    <SlidePanel open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SlidePanelHeader onClose={onClose}>
        <SlidePanelTitle>{isEdit ? 'Edytuj wpis' : 'Dodaj wpis'}</SlidePanelTitle>
      </SlidePanelHeader>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
        <SlidePanelContent className="space-y-5">
          {/* Typ */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Typ</label>
            <Controller
              name="typ"
              control={control}
              render={({ field }) => (
                <div className="flex gap-2">
                  {(Object.entries(WPIS_TYP_CONFIG) as [RealizacjaWpisTyp, typeof WPIS_TYP_CONFIG[RealizacjaWpisTyp]][]).map(([key, config]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => field.onChange(key)}
                      className={cn(
                        'rounded-md px-3 py-1.5 text-sm cursor-pointer border transition-colors',
                        field.value === key
                          ? config.className
                          : 'border-white/[0.06] text-white/40 hover:text-white/60'
                      )}
                    >
                      {config.label}
                    </button>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Kwota netto */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Kwota netto</label>
            <div className="relative">
              <Input
                type="number"
                step="0.01"
                {...register('kwota_netto', { valueAsNumber: true })}
                className="pr-10"
                placeholder="0.00"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">zł</span>
            </div>
            {errors.kwota_netto && (
              <p className="text-xs text-red-400">{errors.kwota_netto.message}</p>
            )}
          </div>

          {/* Numer faktury */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Numer faktury</label>
            <Input {...register('numer_faktury')} placeholder="np. FV/2026/001" />
          </div>

          {/* Data faktury */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Data faktury</label>
            <Input type="date" {...register('data_faktury')} />
          </div>

          {/* Opis */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Opis</label>
            <Textarea {...register('opis')} maxLength={500} placeholder="Opis wpisu..." rows={3} />
          </div>

          {/* Powiązanie */}
          <div className="space-y-2">
            <label className="text-sm text-white/60">Powiązanie</label>
            <Select value={powiazanieTyp} onValueChange={handlePowiazanieChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brak">Brak</SelectItem>
                <SelectItem value="zamowienie">Zamówienie</SelectItem>
                <SelectItem value="umowa">Umowa</SelectItem>
              </SelectContent>
            </Select>

            {powiazanieTyp === 'zamowienie' && zamowieniaList.length > 0 && (
              <Controller
                name="zamowienie_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz zamówienie" />
                    </SelectTrigger>
                    <SelectContent>
                      {zamowieniaList.map((z) => (
                        <SelectItem key={z.id} value={z.id}>{z.numer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}

            {powiazanieTyp === 'umowa' && umowyList.length > 0 && (
              <Controller
                name="umowa_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={(v) => field.onChange(v || null)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Wybierz umowę" />
                    </SelectTrigger>
                    <SelectContent>
                      {umowyList.map((u) => (
                        <SelectItem key={u.id} value={u.id}>{u.numer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          {/* Opłacone */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              {...register('oplacone')}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/30"
            />
            <label className="text-sm text-white/60">Opłacone</label>
          </div>
        </SlidePanelContent>
        <SlidePanelFooter>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-500 text-white">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEdit ? 'Zapisz zmiany' : 'Dodaj wpis'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Anuluj
            </Button>
          </div>
        </SlidePanelFooter>
      </form>
    </SlidePanel>
  );
}
