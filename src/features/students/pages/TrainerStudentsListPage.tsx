import { ArrowDownWideNarrow, Search } from 'lucide-react';
import { useState } from 'react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StudentList } from '../components/StudentList';

/** Listado completo de la cartera, filtrable por nombre (el backend ya la ordena por urgencia). */
export function TrainerStudentsListPage() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <PageHeader
        kicker="Alumnos"
        title="Cartera completa."
        description="Una vista consolidada para detectar dónde intervenir y abrir la ficha de cada alumno."
      />
      <main className="page-body">
        <BentoCard>
          <div className="mb-5 flex flex-col gap-3.5 border-b border-[#292823]/10 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-md flex-1">
              <Search
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#858278]"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar alumno…"
                aria-label="Buscar alumno por nombre"
                className="field pl-10"
              />
            </div>
            <span className="chip-neutral self-start px-3.5 py-2 sm:self-center">
              <ArrowDownWideNarrow className="size-3.5" aria-hidden="true" />
              Ordenados por urgencia
            </span>
          </div>
          <StudentList query={query} />
        </BentoCard>
      </main>
    </div>
  );
}
