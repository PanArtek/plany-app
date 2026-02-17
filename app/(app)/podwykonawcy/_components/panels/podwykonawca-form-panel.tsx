'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { z } from 'zod';
import { ChevronDown } from 'lucide-react';
import {
  SlidePanel,
  SlidePanelHeader,
  SlidePanelTitle,
  SlidePanelContent,
  SlidePanelFooter,
} from '@/components/ui/slide-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { createPodwykonawca, updatePodwykonawca, getPodwykonawca, type PodwykonawcaWithCount } from '@/actions/podwykonawcy';

const podwykonawcaFormSchema = z.object({
  nazwa: z.string().min(1, "Nazwa jest wymagana").max(255, "Max 255 znaków"),
  specjalizacja: z.string().max(100, "Max 100 znaków").optional().or(z.literal('')),
  kontakt: z.string().optional().or(z.literal('')),
  aktywny: z.boolean(),
  ocena: z.number().int().min(1).max(5).optional().nullable(),
  email: z.string().email("Nieprawidłowy email").optional().or(z.literal('')),
  strona_www: z.string().max(500, "Max 500 znaków").optional().or(z.literal('')),
  nazwa_pelna: z.string().max(500, "Max 500 znaków").optional().or(z.literal('')),
  nip: z.string().max(13, "Max 13 znaków").optional().or(z.literal('')),
  regon: z.string().max(14, "Max 14 znaków").optional().or(z.literal('')),
  krs: z.string().max(10, "Max 10 znaków").optional().or(z.literal('')),
  adres_siedziby: z.string().optional().or(z.literal('')),
  osoba_reprezentujaca: z.string().max(255, "Max 255 znaków").optional().or(z.literal('')),
  nr_konta: z.string().max(32, "Max 32 znaków").optional().or(z.literal('')),
  uwagi: z.string().optional().or(z.literal('')),
});

type PodwykonawcaFormValues = z.infer<typeof podwykonawcaFormSchema>;

interface PodwykonawcaFormPanelProps {
  mode: 'add' | 'edit';
  podwykonawca?: PodwykonawcaWithCount;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const emptyDefaults: PodwykonawcaFormValues = {
  nazwa: '',
  specjalizacja: '',
  kontakt: '',
  aktywny: true,
  ocena: null,
  email: '',
  strona_www: '',
  nazwa_pelna: '',
  nip: '',
  regon: '',
  krs: '',
  adres_siedziby: '',
  osoba_reprezentujaca: '',
  nr_konta: '',
  uwagi: '',
};

export function PodwykonawcaFormPanel({ mode, podwykonawca, open, onOpenChange }: PodwykonawcaFormPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractOpen, setContractOpen] = useState(false);
  const isEdit = mode === 'edit';

  const form = useForm<PodwykonawcaFormValues>({
    resolver: zodResolver(podwykonawcaFormSchema),
    defaultValues: emptyDefaults,
  });

  useEffect(() => {
    if (open) {
      if (isEdit && podwykonawca) {
        // Fetch full data with new fields
        getPodwykonawca(podwykonawca.id).then((full) => {
          if (full) {
            form.reset({
              nazwa: full.nazwa,
              specjalizacja: full.specjalizacja || '',
              kontakt: full.kontakt || '',
              aktywny: full.aktywny,
              ocena: full.ocena ?? null,
              email: full.email || '',
              strona_www: full.strona_www || '',
              nazwa_pelna: full.nazwa_pelna || '',
              nip: full.nip || '',
              regon: full.regon || '',
              krs: full.krs || '',
              adres_siedziby: full.adres_siedziby || '',
              osoba_reprezentujaca: full.osoba_reprezentujaca || '',
              nr_konta: full.nr_konta || '',
              uwagi: full.uwagi || '',
            });
            // Open contract section if any contract data exists
            if (full.nazwa_pelna || full.nip || full.regon || full.krs || full.adres_siedziby || full.osoba_reprezentujaca || full.nr_konta) {
              setContractOpen(true);
            }
          }
        });
      } else {
        form.reset(emptyDefaults);
        setContractOpen(false);
      }
    }
  }, [open, isEdit, podwykonawca, form]);

  async function onSubmit(data: PodwykonawcaFormValues) {
    setIsSubmitting(true);
    try {
      const payload = {
        nazwa: data.nazwa,
        specjalizacja: data.specjalizacja || undefined,
        kontakt: data.kontakt || undefined,
        aktywny: data.aktywny,
        ocena: data.ocena ?? undefined,
        email: data.email || undefined,
        strona_www: data.strona_www || undefined,
        nazwa_pelna: data.nazwa_pelna || undefined,
        nip: data.nip || undefined,
        regon: data.regon || undefined,
        krs: data.krs || undefined,
        adres_siedziby: data.adres_siedziby || undefined,
        osoba_reprezentujaca: data.osoba_reprezentujaca || undefined,
        nr_konta: data.nr_konta || undefined,
        uwagi: data.uwagi || undefined,
      };

      const result = isEdit && podwykonawca
        ? await updatePodwykonawca(podwykonawca.id, payload)
        : await createPodwykonawca(payload);

      if (result.success) {
        toast.success(isEdit ? 'Zapisano zmiany' : 'Dodano podwykonawcę');
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Błąd zapisu');
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const inputClass = "bg-white/5 border-white/10 text-white placeholder:text-white/30";
  const labelClass = "text-white/80";

  return (
    <SlidePanel open={open} onOpenChange={onOpenChange}>
      <SlidePanelHeader onClose={() => onOpenChange(false)}>
        <SlidePanelTitle>{isEdit ? 'Edytuj podwykonawcę' : 'Dodaj podwykonawcę'}</SlidePanelTitle>
      </SlidePanelHeader>

      <SlidePanelContent>
        <Form {...form}>
          <form id="podwykonawca-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* SEKCJA: Podstawowe */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Podstawowe</h3>
              <FormField
                control={form.control}
                name="nazwa"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Nazwa *</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputClass} placeholder="np. Ekipa GK Budmont" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specjalizacja"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Specjalizacja</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputClass} placeholder="np. GK, Tynki, Sufity" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ocena"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Ocena</FormLabel>
                    <Select
                      value={field.value?.toString() ?? ''}
                      onValueChange={(val) => field.onChange(val ? Number(val) : null)}
                    >
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder="Brak oceny" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="5">5 - Doskonały</SelectItem>
                        <SelectItem value="4">4 - Bardzo dobry</SelectItem>
                        <SelectItem value="3">3 - Dobry</SelectItem>
                        <SelectItem value="2">2 - Przeciętny</SelectItem>
                        <SelectItem value="1">1 - Słaby</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SEKCJA: Kontakt */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Kontakt</h3>
              <FormField
                control={form.control}
                name="kontakt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Telefon</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputClass} placeholder="np. 501 234 567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" className={inputClass} placeholder="np. biuro@firma.pl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="strona_www"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={labelClass}>Strona WWW</FormLabel>
                    <FormControl>
                      <Input {...field} className={inputClass} placeholder="np. firma.pl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* SEKCJA: Dane do umowy (collapsible) */}
            <Collapsible open={contractOpen} onOpenChange={setContractOpen}>
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 text-xs font-medium text-white/50 uppercase tracking-wider hover:text-white/70 transition-colors w-full"
                >
                  <ChevronDown className={`h-3 w-3 transition-transform ${contractOpen ? '' : '-rotate-90'}`} />
                  Dane do umowy
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="nazwa_pelna"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Nazwa pełna</FormLabel>
                      <FormControl>
                        <Input {...field} className={inputClass} placeholder="np. Firma Sp. z o.o." />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="nip"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>NIP</FormLabel>
                        <FormControl>
                          <Input {...field} className={inputClass} placeholder="123-456-78-90" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="regon"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={labelClass}>REGON</FormLabel>
                        <FormControl>
                          <Input {...field} className={inputClass} placeholder="123456789" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="krs"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>KRS</FormLabel>
                      <FormControl>
                        <Input {...field} className={inputClass} placeholder="0000123456" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="adres_siedziby"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Adres siedziby</FormLabel>
                      <FormControl>
                        <Textarea {...field} className={`${inputClass} min-h-[60px]`} placeholder="ul. Przykładowa 1, 00-000 Warszawa" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="osoba_reprezentujaca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Osoba reprezentująca</FormLabel>
                      <FormControl>
                        <Input {...field} className={inputClass} placeholder="np. Jan Kowalski" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nr_konta"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={labelClass}>Nr konta bankowego</FormLabel>
                      <FormControl>
                        <Input {...field} className={inputClass} placeholder="PL61 1090 1014 0000 0712 3456 7890" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* SEKCJA: Uwagi */}
            <div className="space-y-4">
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Uwagi</h3>
              <FormField
                control={form.control}
                name="uwagi"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        {...field}
                        className={`${inputClass} min-h-[80px]`}
                        placeholder="Dodatkowe informacje..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Aktywny */}
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
          form="podwykonawca-form"
          disabled={isSubmitting}
          className="bg-amber-500 text-black hover:bg-amber-400"
        >
          {isSubmitting ? 'Zapisywanie...' : isEdit ? 'Zapisz' : 'Dodaj'}
        </Button>
      </SlidePanelFooter>
    </SlidePanel>
  );
}
