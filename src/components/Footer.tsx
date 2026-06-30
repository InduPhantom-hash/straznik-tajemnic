// src/components/Footer.tsx
export const Footer = () => {
  return (
    <footer className="border-t border-border/40 py-6 md:py-8">
      <div className="container max-w-screen-2xl text-center text-sm text-muted-foreground space-y-1">
        <p className="font-medium text-foreground">Strażnik Tajemnic</p>
        <p>Wirtualny Mistrz Gry do Zew Cthulhu, 7. edycja</p>
        <p>© {new Date().getFullYear()} · Created by Phantom</p>
      </div>
    </footer>
  );
};
