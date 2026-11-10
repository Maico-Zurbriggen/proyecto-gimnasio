import {
  ArrowUpRight,
  BarChart3,
  Dumbbell,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { InsufficientInfo } from '../../../shared/components/InsufficientInfo';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { GymSetupChecklist } from '../components/GymSetupChecklist';
import { PageHeader } from '../../../shared/ui/PageHeader';

/** Analítica del gimnasio. Vista de referencia visual, sin datos reales. */
export function AdminAnalyticsPage() {
  return (
    <div>
      <PageHeader
        kicker="Analítica del gimnasio"
        title="La salud de la comunidad."
        description="Indicadores agregados para anticipar deserción y acompañar la operación del gimnasio."
      />
      <main className="page-body space-y-6">
        <GymSetupChecklist />

        {/* Accesos rápidos de gestión para administradores */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link
            to="/admin/usuarios"
            className="card-interactive flex items-center justify-between rounded-2xl border border-[#292823]/10 bg-white/80 p-4 shadow-xs hover:border-graphite"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-graphite text-lime shadow-xs">
                <UsersRound className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Invitaciones</p>
                <p className="text-[11px] text-[#77756d]">
                  Entrenadores y alumnos
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="size-4 text-[#77756d]"
              aria-hidden="true"
            />
          </Link>

          <Link
            to="/admin/asignaciones"
            className="card-interactive flex items-center justify-between rounded-2xl border border-[#292823]/10 bg-white/80 p-4 shadow-xs hover:border-graphite"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-lime text-graphite shadow-xs">
                <ShieldCheck className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Asignaciones</p>
                <p className="text-[11px] text-[#77756d]">
                  Carteras de alumnos
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="size-4 text-[#77756d]"
              aria-hidden="true"
            />
          </Link>

          <Link
            to="/admin/inventario"
            className="card-interactive flex items-center justify-between rounded-2xl border border-[#292823]/10 bg-white/80 p-4 shadow-xs hover:border-graphite"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#292823]/6 text-ink shadow-xs">
                <Dumbbell className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold text-ink">Inventario</p>
                <p className="text-[11px] text-[#77756d]">
                  Equipamiento disponible
                </p>
              </div>
            </div>
            <ArrowUpRight
              className="size-4 text-[#77756d]"
              aria-hidden="true"
            />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <BentoCard className="sm:col-span-3">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3
                className="size-4.5 text-[#77756d]"
                aria-hidden="true"
              />
              <p className="eyebrow text-[#77756d]">Métricas agregadas</p>
            </div>
            <InsufficientInfo
              missing="socios activos, actividad semanal y seguimiento"
              action="Indicadores aún no disponibles: se mostrarán cuando haya datos reales."
            />
          </BentoCard>
        </div>
      </main>
    </div>
  );
}
