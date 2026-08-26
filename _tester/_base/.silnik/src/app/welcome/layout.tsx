import '../globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome / Witaj',
};

export default function WelcomeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="font-serif">
        {children}
      </body>
    </html>
  );
}
