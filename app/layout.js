import './globals.css';
import { siteUrl, SITE_NAME, TAGLINE } from '@/lib/content';

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${TAGLINE}`, template: `%s | ${SITE_NAME}` },
  description: 'O blog da Braziw com curiosidades sobre a França, dicas de francês, cultura europeia e muito mais para quem quer aprender o idioma.',
  icons: { icon: '/img/logo.png' },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
};

export const viewport = { themeColor: '#0a1a44' };

const themeScript = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t;else if(matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.dataset.theme='dark'}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Outfit:wght@500;600;700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
