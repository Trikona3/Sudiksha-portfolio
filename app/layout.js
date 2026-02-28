import './globals.css';

export const metadata = {
  title: 'Sudiksha Rajavaram Portfolio',
  description: 'Portfolio website',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
