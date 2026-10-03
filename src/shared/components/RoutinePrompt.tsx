export function RoutinePrompt({ prompt }: { prompt: string | null }) {
  if (!prompt) return null;
  return (
    <section
      aria-label="Prompt solicitado"
      className="rounded-xl border border-black/10 bg-[#f4f3ee] p-4"
    >
      <h3 className="text-sm font-semibold">Prompt solicitado</h3>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#55534c]">
        {prompt}
      </p>
    </section>
  );
}
