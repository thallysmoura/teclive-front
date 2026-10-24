export function Spinner({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg className={`animate-spin text-ds-primary ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ds-bg">
      <Spinner />
    </div>
  );
}

/** Spinner da área de conteúdo: aparece só se a espera passar de ~150 ms (evita piscar) e entra suavemente. */
export function ContentSpinner() {
  return (
    <main className="flex min-w-0 flex-1 items-center justify-center" aria-busy="true">
      <div role="status" aria-label="Carregando" className="flex flex-col items-center gap-3 motion-safe:animate-[spinner-in_240ms_ease-out_150ms_both] motion-reduce:opacity-100">
        <Spinner className="h-8 w-8 motion-reduce:animate-none" />
        <span className="text-sm text-ds-text-secondary">Carregando...</span>
      </div>
    </main>
  );
}
