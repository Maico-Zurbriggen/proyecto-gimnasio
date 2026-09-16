import { Search, SlidersHorizontal } from 'lucide-react';

import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { StudentList } from '../components/StudentList';

/** Listado completo de la cartera. La búsqueda/filtro son de referencia visual. */
export function TrainerStudentsListPage() {
  return (
    <div>
      <PageHeader
        kicker="Alumnos"
        title="Cartera completa."
        description="Una vista consolidada para detectar dónde intervenir y abrir la ficha de cada alumno."
      />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-[#292823]/10 bg-white px-4 py-3">
            <Search className="size-4 text-[#858278]" />
            <span className="text-xs text-[#89867d]">Buscar alumno…</span>
          </div>
          <button
            type="button"
            className="flex items-center justify-center gap-2 rounded-xl border border-[#292823]/10 bg-white px-4 py-3 text-xs font-bold"
          >
            <SlidersHorizontal className="size-4" />
            Orden: urgencia
          </button>
        </div>
        <BentoCard>
          <StudentList />
        </BentoCard>
      </main>
    </div>
  );
}
