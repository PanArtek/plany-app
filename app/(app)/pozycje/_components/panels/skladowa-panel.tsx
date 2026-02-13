'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Package, HardHat } from 'lucide-react';
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

export function SkladowaPanel(props: Props) {
  const { type, mode, pozycjaId, open, onOpenChange } = props;

  if (type === 'robocizna') {
    return <RobociznaForm {...(props as RobociznaProps)} />;
  }
  return <MaterialForm {...(props as MaterialProps)} />;
}

// ==================== MATERIAL FORM ====================

function MaterialForm({ mode, pozycjaId, open, onOpenChange, skladowa }: MaterialProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const materialForm = useForm<CreateSkladowaMaterialInput>({
    resolver: zodResolver(createSkladowaMaterialSchema),
    defaultValues: {
      nazwa: '',
      norma_domyslna: 1,
      jednostka: undefined,
      cena_domyslna: undefined,
    },
  });

  useEffect(() => {
    if (open) {
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
    }
  }, [open, isEdit, skladowa, materialForm]);

  const materialValues = materialForm.watch();

  const pricePreview = useMemo(() => {
    const norma = materialValues.norma_domyslna || 0;
    const cena = materialValues.cena_domyslna || 0;
    return norma * cena;
  }, [materialValues]);

  async function onSubmit(data: CreateSkladowaMaterialInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && skladowa) {
        const result = await updateSkladowaMaterial(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Blad zapisu');
        }
      } else {
        const result = await createSkladowaMaterial(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano skladowa materialowa');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Blad dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="narrow">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <SlidePanelTitle>{isEdit ? 'Edytuj skladowa' : 'Dodaj skladowa'}</SlidePanelTitle>
          <Badge className="bg-blue-500/10 text-blue-400 border-0">
            <Package className="w-3 h-3 mr-1" />
            Material
          </Badge>
        </div>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...materialForm}>
          <form id="skladowa-form" onSubmit={materialForm.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={materialForm.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nazwa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Nazwa materialu"
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
                      placeholder="zl/jednostka"
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

            {pricePreview > 0 && (
              <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                <div className="text-xs text-white/50 mb-1">Szacunkowy koszt</div>
                <div className="text-lg font-medium text-blue-400">
                  {pricePreview.toFixed(2)} zl
                </div>
              </div>
            )}
          </form>
        </Form>
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

// ==================== ROBOCIZNA FORM ====================

function RobociznaForm({ mode, pozycjaId, open, onOpenChange, skladowa }: RobociznaProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<CreateSkladowaRobociznaInput>({
    resolver: zodResolver(createSkladowaRobociznaSchema),
    defaultValues: {
      opis: '',
      cena: 0,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && skladowa) {
        form.reset({
          opis: skladowa.opis || '',
          cena: Number(skladowa.cena ?? 0),
        });
      } else {
        form.reset({
          opis: '',
          cena: 0,
        });
      }
    }
  }, [open, isEdit, skladowa, form]);

  async function onSubmit(data: CreateSkladowaRobociznaInput) {
    setIsSubmitting(true);
    try {
      if (isEdit && skladowa) {
        const result = await updateSkladowaRobocizna(skladowa.id, data);
        if (result.success) {
          toast.success('Zapisano zmiany');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Blad zapisu');
        }
      } else {
        const result = await createSkladowaRobocizna(pozycjaId, data);
        if (result.success) {
          toast.success('Dodano skladowa robociznowa');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Blad dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange} variant="narrow">
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <div className="flex items-center gap-3">
          <SlidePanelTitle>{isEdit ? 'Edytuj skladowa' : 'Dodaj skladowa'}</SlidePanelTitle>
          <Badge className="bg-blue-500/10 text-blue-400 border-0">
            <HardHat className="w-3 h-3 mr-1" />
            Robocizna
          </Badge>
        </div>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="skladowa-r-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="opis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Opis</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="np. Montaż profili, Szpachlowanie"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cena"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Cena za jm</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="zl/jm"
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
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
          form="skladowa-r-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
