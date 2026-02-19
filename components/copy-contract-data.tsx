'use client';

import { ClipboardCopy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface CopyContractDataProps {
  nazwaPelna?: string | null;
  nip?: string | null;
  regon?: string | null;
  krs?: string | null;
  adresSiedziby?: string | null;
  osobaReprezentujaca?: string | null;
  nrKonta?: string | null;
}

export function CopyContractData({
  nazwaPelna,
  nip,
  regon,
  krs,
  adresSiedziby,
  osobaReprezentujaca,
  nrKonta,
}: CopyContractDataProps) {
  const hasData = !!(nazwaPelna || nip || regon || krs || adresSiedziby || osobaReprezentujaca || nrKonta);

  function buildText(): string {
    const lines: string[] = [];
    if (nazwaPelna) lines.push(nazwaPelna);

    const ids: string[] = [];
    if (nip) ids.push(`NIP: ${nip}`);
    if (regon) ids.push(`REGON: ${regon}`);
    if (krs) ids.push(`KRS: ${krs}`);
    if (ids.length > 0) lines.push(ids.join(', '));

    if (adresSiedziby) lines.push(adresSiedziby);
    if (osobaReprezentujaca) lines.push(`Reprezentowany przez: ${osobaReprezentujaca}`);
    if (nrKonta) lines.push(`Nr konta: ${nrKonta}`);

    return lines.join('\n');
  }

  async function handleCopy() {
    const text = buildText();
    await navigator.clipboard.writeText(text);
    toast.success('Skopiowano dane do umowy');
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleCopy}
      disabled={!hasData}
      className="text-white/50 hover:text-white hover:bg-white/5 gap-2 h-7 text-xs"
    >
      <ClipboardCopy className="h-3 w-3" />
      Kopiuj dane do umowy
    </Button>
  );
}
