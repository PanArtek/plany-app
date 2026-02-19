'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, Hammer, Info } from 'lucide-react';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  skladowaMaterialFormSchema,
  skladowaRobociznaFormSchema,
  jednostkaMaterialOptions,
  type SkladowaMaterialFormInput,
  type SkladowaRobociznaFormInput,
} from '@/lib/validations/skladowe';
import {
  createSkladowaMaterial,
  updateSkladowaMaterial,
  createSkladowaRobocizna,
  updateSkladowaRobocizna,
  getCenaCennik,
  getStawkaCennik,
  type SkladowaMaterial,
  type SkladowaRobocizna,
} from '@/actions/skladowe';

type SkladowaType = 'material' | 'robocizna';

interface MaterialProps {
  type: 'material';
  mode: 'add' | 'edit';
  pozycjaId: string;
  skladowa?: SkladowaMaterial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produktOptions?: { id: string; nazwa: string; sku: string }[];
  dostawcaOptions?: { id: string; nazwa: string; kod: string | null }[];
}

interface RobociznaProps {
  type: 'robocizna';
  mode: 'add' | 'edit';
  pozycjaId: string;
  skladowa?: SkladowaRobocizna;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  typRobociznyOptions?: { id: string; nazwa: string; jednostka?: string | null }[];
  podwykonawcaOptions?: { id: string; nazwa: string }[];
}

type Props = MaterialProps | RobociznaProps;

const TYPE_CONFIG: Record<SkladowaType, {
  label: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
}> = {
  material: {
    label: 'Materiał',
    icon: Package,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
  },
  robocizna: {
    label: 'Robocizna',
    icon: Hammer,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
  },
};

function formatCena(value: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
  }).format(value);
}

export function SkladowaPanel(props: Props) {
  const { type, mode, pozycjaId, open, onOpenChange } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cennikPrice, setCennikPrice] = useState<number | null>(null);
  const [cennikLoading, setCennikLoading] = useState(false);
  const isEdit = mode === 'edit';
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Material form
  const materialForm = useForm<SkladowaMaterialFormInput>({
    resolver: zodResolver(skladowaMaterialFormSchema),
    defaultValues: {
      produkt_id: '',
      dostawca_id: '',
      norma_domyslna: 1,
      jednostka: null,
    },
  });

  // Robocizna form
  const robociznaForm = useForm<SkladowaRobociznaFormInput>({
    resolver: zodResolver(skladowaRobociznaFormSchema),
    defaultValues: {
      typ_robocizny_id: '',
      podwykonawca_id: '',
      cena: 0,
    },
  });

  // Watch form values for cennik lookup
  const watchedProduktId = materialForm.watch('produkt_id');
  const watchedDostawcaId = materialForm.watch('dostawca_id');
  const watchedTypRobociznyId = robociznaForm.watch('typ_robocizny_id');
  const watchedPodwykonawcaId = robociznaForm.watch('podwykonawca_id');

  // Cennik lookup for material
  const lookupMaterialPrice = useCallback(async (produktId: string, dostawcaId: string) => {
    if (!produktId || !dostawcaId) {
      setCennikPrice(null);
      return;
    }
    setCennikLoading(true);
    try {
      const result = await getCenaCennik(produktId, dostawcaId);
      setCennikPrice(result?.cena_netto ?? null);
    } finally {
      setCennikLoading(false);
    }
  }, []);

  // Cennik lookup for robocizna
  const lookupRobociznaPrice = useCallback(async (typId: string, podwykonawcaId: string) => {
    if (!typId || !podwykonawcaId) {
      setCennikPrice(null);
      return;
    }
    setCennikLoading(true);
    try {
      const result = await getStawkaCennik(typId, podwykonawcaId);
      if (result?.stawka != null) {
        setCennikPrice(result.stawka);
        // Auto-fill cena field with stawka from cennik
        robociznaForm.setValue('cena', result.stawka);
      } else {
        setCennikPrice(null);
      }
    } finally {
      setCennikLoading(false);
    }
  }, [robociznaForm]);

  // Trigger cennik lookup when material dropdowns change
  useEffect(() => {
    if (type === 'material' && open) {
      lookupMaterialPrice(watchedProduktId, watchedDostawcaId);
    }
  }, [type, open, watchedProduktId, watchedDostawcaId, lookupMaterialPrice]);

  // Trigger cennik lookup when robocizna dropdowns change
  useEffect(() => {
    if (type === 'robocizna' && open) {
      lookupRobociznaPrice(watchedTypRobociznyId, watchedPodwykonawcaId);
    }
  }, [type, open, watchedTypRobociznyId, watchedPodwykonawcaId, lookupRobociznaPrice]);

  // Reset forms when panel opens
  useEffect(() => {
    if (open) {
      setCennikPrice(null);
      if (type === 'material') {
        const skladowa = props.skladowa as SkladowaMaterial | undefined;
        if (isEdit && skladowa) {
          materialForm.reset({
            produkt_id: skladowa.produkt_id || '',
            dostawca_id: skladowa.dostawca_id || '',
            norma_domyslna: skladowa.norma_domyslna || 1,
            jednostka: (skladowa.jednostka as SkladowaMaterialFormInput['jednostka']) || null,
          });
        } else {
          materialForm.reset({
            produkt_id: '',
            dostawca_id: '',
            norma_domyslna: 1,
            jednostka: null,
          });
        }
      } else {
        const skladowa = props.skladowa as SkladowaRobocizna | undefined;
        if (isEdit && skladowa) {
          robociznaForm.reset({
            typ_robocizny_id: skladowa.typ_robocizny_id || '',
            podwykonawca_id: skladowa.podwykonawca_id || '',
            cena: skladowa.cena || 0,
          });
        } else {
          robociznaForm.reset({
            typ_robocizny_id: '',
            podwykonawca_id: '',
            cena: 0,
          });
        }
      }
    }
  }, [open, type, isEdit, props.skladowa, materialForm, robociznaForm]);

  async function onSubmitMaterial(data: SkladowaMaterialFormInput) {
    setIsSubmitting(true);
    try {
      const skladowa = props.skladowa as SkladowaMaterial | undefined;
      if (isEdit && skladowa) {
        const result = await updateSkladowaMaterial(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createSkladowaMaterial(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano składową materiałową');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function onSubmitRobocizna(data: SkladowaRobociznaFormInput) {
    setIsSubmitting(true);
    try {
      const skladowa = props.skladowa as SkladowaRobocizna | undefined;
      if (isEdit && skladowa) {
        const result = await updateSkladowaRobocizna(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createSkladowaRobocizna(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano składową robocizny');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const panelTitle = isEdit ? `Edytuj składową` : `Dodaj składową`;
  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/30";

  const produktOptions = type === 'material' ? (props as MaterialProps).produktOptions ?? [] : [];
  const dostawcaOptions = type === 'material' ? (props as MaterialProps).dostawcaOptions ?? [] : [];
  const typRobociznyOptions = type === 'robocizna' ? (props as RobociznaProps).typRobociznyOptions ?? [] : [];
  const podwykonawcaOptions = type === 'robocizna' ? (props as RobociznaProps).podwykonawcaOptions ?? [] : [];

  // Cennik info badge
  const cennikBadge = cennikLoading ? (
    <div className="text-xs text-white/40 animate-pulse">Szukam w cenniku...</div>
  ) : cennikPrice !== null ? (
    <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">
      <Info className="w-3 h-3" />
      Cennik: {formatCena(cennikPrice)}
    </div>
  ) : (watchedProduktId && watchedDostawcaId && type === 'material') || (watchedTypRobociznyId && watchedPodwykonawcaId && type === 'robocizna') ? (
    <div className="flex items-center gap-1.5 text-xs text-white/40">
      <Info className="w-3 h-3" />
      Brak ceny w cenniku
    </div>
  ) : null;

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="narrow">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <SlidePanelTitle>{panelTitle}</SlidePanelTitle>
          <Badge className={`${config.bgColor} ${config.color} border-0`}>
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </SlidePanelHeader>

      <SlidePanelContent>
        {type === 'material' ? (
          <Form {...materialForm}>
            <form id="skladowa-form" onSubmit={materialForm.handleSubmit(onSubmitMaterial)} className="space-y-6">
              <FormField
                control={materialForm.control}
                name="produkt_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Produkt *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Wybierz produkt" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {produktOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-amber-500 mr-2">{p.sku}</span>
                            {p.nazwa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={materialForm.control}
                name="dostawca_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Dostawca *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Wybierz dostawcę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dostawcaOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.kod && <span className="font-mono text-xs text-amber-500 mr-2">{d.kod}</span>}
                            {d.nazwa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {cennikBadge && <div>{cennikBadge}</div>}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={materialForm.control}
                  name="norma_domyslna"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Norma</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className={inputClass}
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          value={field.value}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={materialForm.control}
                  name="jednostka"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Jednostka</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value ?? ''}
                      >
                        <FormControl>
                          <SelectTrigger className={`w-full ${inputClass}`}>
                            <SelectValue placeholder="Wybierz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jednostkaMaterialOptions.map((j) => (
                            <SelectItem key={j} value={j}>
                              {j}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        ) : (
          <Form {...robociznaForm}>
            <form id="skladowa-form" onSubmit={robociznaForm.handleSubmit(onSubmitRobocizna)} className="space-y-6">
              <FormField
                control={robociznaForm.control}
                name="typ_robocizny_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Typ robocizny *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Wybierz typ robocizny" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {typRobociznyOptions.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.nazwa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={robociznaForm.control}
                name="podwykonawca_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Podwykonawca *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Wybierz podwykonawcę" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {podwykonawcaOptions.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nazwa}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {cennikBadge && <div>{cennikBadge}</div>}

              <FormField
                control={robociznaForm.control}
                name="cena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Cena</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="zł"
                        className={inputClass}
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        value={field.value}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}
      </SlidePanelContent>

      <SlidePanelFooter>
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="text-white/60 hover:text-white hover:bg-white/5"
        >
          Anuluj
        </Button>
        <Button
          type="submit"
          form="skladowa-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
