import { JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google';

export const fontMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-mono',
});

export const fontSans = Plus_Jakarta_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-sans',
});
