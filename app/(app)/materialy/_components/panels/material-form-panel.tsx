'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
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
import { produktFormSchema, jednostkaOptions, type CreateProduktInput } from '@/lib/validations/materialy';
import { createProdukt, updateProdukt, type ProduktWithAggregation } from '@/actions/materialy';
import { z } from 'zod';

type ProduktFormValues = z.infer<typeof produktFormSchema>;

interface MaterialFormPanelProps {
  mode: 'add' | 'edit';
  produkt?: ProduktWithAggregation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaterialFormPanel({ mode, produkt, open, onOpenChange }: MaterialFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<ProduktFormValues>({
    resolver: zodResolver(produktFormSchema),
    defaultValues: {
      sku: '',
      nazwa: '',
      jednostka: 'szt',
      aktywny: true,
    },
  });

  useEffect(() => {
    if (open) {
      if (isEdit && produkt) {
        form.reset({
          sku: produkt.sku,
          nazwa: produkt.nazwa,
          jednostka: produkt.jednostka as ProduktFormValues['jednostka'],
          aktywny: produkt.aktywny,
        });
      } else {
        form.reset({
          sku: '',
          nazwa: '',
          jednostka: 'szt',
          aktywny: true,
        });
      }
    }
  }, [open, isEdit, produkt, form]);

  async function onSubmit(data: ProduktFormValues) {
    setIsSubmitting(true);
    try {
      const result = isEdit && produkt
        ? await updateProdukt(produkt.id, data)
        : await createProdukt(data);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano materiał');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd zapisu');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj materiał' : 'Dodaj materiał'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="material-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">SKU</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="font-mono bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. GK-PLYTA-125"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nazwa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Nazwa</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                      placeholder="np. Płyta GK 12.5mm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="jednostka"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white/80">Jednostka</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white">
                        <SelectValue placeholder="Wybierz jednostkę" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {jednostkaOptions.map((j) => (
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
          form="material-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
