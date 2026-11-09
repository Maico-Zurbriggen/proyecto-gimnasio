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
      className="mb-6 flex w-full gap-1.5 overflow-x-auto rounded-full border border-[#d0cdc4] bg-[#dedbd0]/80 p-1.5 shadow-2xs backdrop-blur-md sm:w-fit"
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) =>
            `rounded-full px-4.5 py-2 text-xs font-bold whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-graphite text-white shadow-md ring-1 ring-white/10'
                : 'text-[#504e46] hover:bg-white/70 hover:text-ink'
            }`
          }
        >
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}
