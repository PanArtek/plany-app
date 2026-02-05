'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, Hammer } from 'lucide-react';
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
  createSkladowaMaterialSchema,
  createSkladowaRobociznaSchema,
  jednostkaMaterialOptions,
  jednostkaRobociznaOptions,
  type CreateSkladowaMaterialInput,
  type CreateSkladowaRobociznaInput,
} from '@/lib/validations/skladowe';
import {
  createSkladowaMaterial,
  updateSkladowaMaterial,
  createSkladowaRobocizna,
  updateSkladowaRobocizna,
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
}

interface RobociznaProps {
  type: 'robocizna';
  mode: 'add' | 'edit';
  pozycjaId: string;
  skladowa?: SkladowaRobocizna;
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export function SkladowaPanel(props: Props) {
  const { type, mode, pozycjaId, open, onOpenChange } = props;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  // Material form
  const materialForm = useForm<CreateSkladowaMaterialInput>({
    resolver: zodResolver(createSkladowaMaterialSchema),
    defaultValues: {
      nazwa: '',
      norma_domyslna: 1,
      jednostka: undefined,
      cena_domyslna: undefined,
    },
  });

  // Robocizna form
  const robociznaForm = useForm<CreateSkladowaRobociznaInput>({
    resolver: zodResolver(createSkladowaRobociznaSchema),
    defaultValues: {
      opis: '',
      norma_domyslna: 1,
      jednostka: 'h',
      stawka_domyslna: undefined,
    },
  });

  // Reset forms when panel opens
  useEffect(() => {
    if (open) {
      if (type === 'material') {
        const skladowa = props.skladowa as SkladowaMaterial | undefined;
        if (isEdit && skladowa) {
          materialForm.reset({
            nazwa: skladowa.nazwa || '',
            norma_domyslna: skladowa.norma_domyslna || 1,
            jednostka: (skladowa.jednostka as CreateSkladowaMaterialInput['jednostka']) || undefined,
            cena_domyslna: skladowa.cena_domyslna ?? undefined,
          });
        } else {
          materialForm.reset({
            nazwa: '',
            norma_domyslna: 1,
            jednostka: undefined,
            cena_domyslna: undefined,
          });
        }
      } else {
        const skladowa = props.skladowa as SkladowaRobocizna | undefined;
        if (isEdit && skladowa) {
          robociznaForm.reset({
            opis: skladowa.opis || '',
            norma_domyslna: skladowa.norma_domyslna || 1,
            jednostka: (skladowa.jednostka as CreateSkladowaRobociznaInput['jednostka']) || 'h',
            stawka_domyslna: skladowa.stawka_domyslna ?? undefined,
          });
        } else {
          robociznaForm.reset({
            opis: '',
            norma_domyslna: 1,
            jednostka: 'h',
            stawka_domyslna: undefined,
          });
        }
      }
    }
  }, [open, type, isEdit, props.skladowa, materialForm, robociznaForm]);

  // Live price calculation
  const materialValues = materialForm.watch();
  const robociznaValues = robociznaForm.watch();

  const pricePreview = useMemo(() => {
    if (type === 'material') {
      const norma = materialValues.norma_domyslna || 0;
      const cena = materialValues.cena_domyslna || 0;
      return norma * cena;
    } else {
      const norma = robociznaValues.norma_domyslna || 0;
      const stawka = robociznaValues.stawka_domyslna || 0;
      return norma * stawka;
    }
  }, [type, materialValues, robociznaValues]);

  async function onSubmitMaterial(data: CreateSkladowaMaterialInput) {
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

  async function onSubmitRobocizna(data: CreateSkladowaRobociznaInput) {
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
                name="nazwa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Nazwa</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Nazwa materiału"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
                          className="bg-white/5 border-white/10 text-white"
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
                          <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
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

              <FormField
                control={materialForm.control}
                name="cena_domyslna"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Cena (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="zł/jednostka"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live price calculation preview */}
              {pricePreview > 0 && (
                <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                  <div className="text-xs text-white/50 mb-1">Szacunkowy koszt</div>
                  <div className="text-lg font-medium text-blue-400">
                    {pricePreview.toFixed(2)} zł
                  </div>
                </div>
              )}
            </form>
          </Form>
        ) : (
          <Form {...robociznaForm}>
            <form id="skladowa-form" onSubmit={robociznaForm.handleSubmit(onSubmitRobocizna)} className="space-y-6">
              <FormField
                control={robociznaForm.control}
                name="opis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Opis</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Opis pracy"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={robociznaForm.control}
                  name="norma_domyslna"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Norma</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className="bg-white/5 border-white/10 text-white"
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
                  control={robociznaForm.control}
                  name="jednostka"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white/80">Jednostka</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="w-full bg-white/5 border-white/10 text-white">
                            <SelectValue placeholder="Wybierz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {jednostkaRobociznaOptions.map((j) => (
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

              <FormField
                control={robociznaForm.control}
                name="stawka_domyslna"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Stawka (opcjonalnie)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="zł/jednostka"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? undefined : parseFloat(val));
                        }}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live price calculation preview */}
              {pricePreview > 0 && (
                <div className="p-3 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                  <div className="text-xs text-white/50 mb-1">Szacunkowy koszt</div>
                  <div className="text-lg font-medium text-emerald-400">
                    {pricePreview.toFixed(2)} zł
                  </div>
                </div>
              )}
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
