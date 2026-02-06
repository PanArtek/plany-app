'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { getAllProdukty } from '@/actions/materialy';
import { createCena, updateCena, type CennikEntry } from '@/actions/dostawcy';

const cennikFormSchema = z.object({
  produktId: z.string().uuid("Wybierz produkt"),
  cenaNetto: z.number().positive("Cena musi być większa od 0"),
  aktywny: z.boolean(),
});

type CennikFormValues = z.infer<typeof cennikFormSchema>;

interface CennikFormPanelProps {
  mode: 'add' | 'edit';
  dostawcaId: string | null;
  cena?: CennikEntry;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CennikFormPanel({ mode, dostawcaId, cena, open, onOpenChange }: CennikFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [produkty, setProdukty] = useState<{ id: string; sku: string; nazwa: string; jednostka: string }[]>([]);
  const [loadingProdukty, setLoadingProdukty] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<CennikFormValues>({
    resolver: zodResolver(cennikFormSchema),
    defaultValues: {
      produktId: '',
      cenaNetto: 0,
      aktywny: true,
    },
  });

  // Fetch products for dropdown
  useEffect(() => {
    if (open) {
      setLoadingProdukty(true);
      getAllProdukty().then((data) => {
        setProdukty(data);
        setLoadingProdukty(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (isEdit && cena) {
        form.reset({
          produktId: cena.produktId,
          cenaNetto: cena.cenaNetto,
          aktywny: cena.aktywny,
        });
      } else {
        form.reset({
          produktId: '',
          cenaNetto: 0,
          aktywny: true,
        });
      }
    }
  }, [open, isEdit, cena, form]);

  async function onSubmit(data: CennikFormValues) {
    if (!dostawcaId) return;

    setIsSubmitting(true);
    try {
      if (isEdit && cena) {
        const result = await updateCena(cena.id, {
          cenaNetto: data.cenaNetto,
          aktywny: data.aktywny,
        });
        if (result.success) {
          toast.success('Zapisano zmianę ceny');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd zapisu');
        }
      } else {
        const result = await createCena({
          dostawcaId,
          produktId: data.produktId,
          cenaNetto: data.cenaNetto,
          aktywny: data.aktywny,
        });
        if (result.success) {
          toast.success('Dodano produkt do cennika');
          onOpenChange(false);
        } else {
          toast.error(result.error || 'Błąd dodawania');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj cenę' : 'Dodaj produkt do cennika'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        {loadingProdukty ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white/50" />
          </div>
        ) : (
          <Form {...form}>
            <form id="cennik-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="produktId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Produkt</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white">
                          <SelectValue placeholder="Wybierz produkt..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {produkty.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-amber-500 mr-2">{p.sku}</span>
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
                control={form.control}
                name="cenaNetto"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-white/80">Cena netto (zł)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={field.value || ''}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        className="font-mono bg-white/5 border-white/10 text-white placeholder:text-white/30"
                        placeholder="0.00"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="aktywny"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-3">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="text-white/80 !mt-0">Aktywny</FormLabel>
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
          form="cennik-form"
          disabled={isSubmitting || loadingProdukty}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
