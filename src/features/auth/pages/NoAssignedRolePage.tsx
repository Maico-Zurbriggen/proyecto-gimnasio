import { useSession } from '../hooks/useSession';

/** Estado defensivo para una cuenta activa que no tenga ningún rol reconocido. */
export function NoAssignedRolePage() {
  const { logout } = useSession();

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-[#292823]/10 bg-white p-6 text-center">
        <p className="eyebrow text-[#77756d]">Acceso pendiente</p>
        <h1 className="mt-2 font-display text-2xl font-black text-graphite">
          Tu cuenta no tiene un rol asignado.
        </h1>
        <p className="mt-3 text-sm text-[#6c6a62]">
          Pedile a un administrador del gimnasio que revise tus permisos.
        </p>
        <button
          type="button"
          className="mt-6 rounded-full bg-graphite px-4 py-2.5 text-sm font-bold text-white"
          onClick={() => void logout()}
        >
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}
