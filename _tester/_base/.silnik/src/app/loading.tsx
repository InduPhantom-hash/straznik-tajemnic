export default function Loading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
          <span className="text-2xl">⚡</span>
        </div>
        <h2 className="text-xl font-mono font-semibold text-foreground mb-2">
          Ładowanie...
        </h2>
        <p className="text-foreground/70">
          Przygotowujemy aplikację dla Ciebie
        </p>
      </div>
    </div>
  )
}
