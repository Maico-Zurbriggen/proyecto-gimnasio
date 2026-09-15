import { NavLink } from 'react-router-dom';

export interface SectionTab {
  label: string;
  to: string;
  end?: boolean;
}

/** Fila de pestañas de sub-navegación dentro de una página (estilo PULSO). */
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  return (
    <nav
      aria-label="Pestañas de sección"
      className="mb-5 flex w-full gap-1 overflow-x-auto rounded-[1.1rem] border border-[#292823]/8 bg-white/65 p-1.5 sm:w-fit"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `whitespace-nowrap rounded-xl px-3.5 py-2 text-[11px] font-bold transition ${
              isActive
                ? 'bg-graphite text-white'
                : 'text-[#77756d] hover:bg-black/5'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
