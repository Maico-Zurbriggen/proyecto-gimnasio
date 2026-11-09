import { NavLink } from 'react-router-dom';

export interface SectionTab {
  label: string;
  to: string;
  end?: boolean;
}

/** Fila de pestañas de sub-navegación dentro de una página (estilo Vivaz Adaptive ). */
export function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  return (
    <nav
      aria-label="Pestañas de sección"
      className="mb-6 flex w-full gap-1 overflow-x-auto rounded-full border border-[#292823]/6 bg-[#292823]/5 p-1 sm:w-fit"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `rounded-full px-4 py-1.5 text-xs font-bold whitespace-nowrap transition ${
              isActive
                ? 'bg-graphite text-white shadow-sm'
                : 'text-[#6c6a62] hover:bg-white/70 hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
