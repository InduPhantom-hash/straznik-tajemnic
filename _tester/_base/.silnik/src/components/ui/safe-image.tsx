import React, { useState } from 'react';
import { FileImage } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Opcjonalna ikona do wyświetlenia w przypadku błędu. Domyślnie FileImage z lucide-react */
  fallbackIcon?: React.ReactNode;
}

/**
 * Komponent chroniący UI przed infinite-loops wywoływanymi przez błędy ładowania obrazków.
 * Utrzymuje wewnętrzny stan błędu. Jeśli `src` padnie, zamiast próbować ładować kolejne 
 * (potencjalnie zepsute) fallbacki URL, renderuje dyskretny `div` ze wsparciem klas Tailwind.
 */
export function SafeImage({ className, alt, fallbackIcon, src, ...props }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div 
        className={cn(
          "flex items-center justify-center bg-stone-900/50 border border-amber-900/20 text-amber-900/50",
          className
        )}
        aria-label={alt || "Brak obrazu"}
        role="img"
      >
        {fallbackIcon || <FileImage className="w-1/3 h-1/3 min-w-8 min-h-8 opacity-50" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        setHasError(true);
      }}
      {...props}
    />
  );
}
