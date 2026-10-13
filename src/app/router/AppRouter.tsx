import { Navigate, Route, Routes } from 'react-router-dom';
import { CatalogPage } from '../../features/exercise-catalog/CatalogPage';
import { GenerationSettingsPage } from '../../features/administration/pages/GenerationSettingsPage';

import { AdminAnalyticsPage } from '../../features/administration/pages/AdminAnalyticsPage';
import { AssignmentsPage } from '../../features/administration/pages/AssignmentsPage';
import { InventoryPage } from '../../features/administration/pages/InventoryPage';
import { RequireRole } from '../../features/auth/components/RequireRole';
import { RequireSession } from '../../features/auth/components/RequireSession';
import { useSession } from '../../features/auth/hooks/useSession';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { NoAssignedRolePage } from '../../features/auth/pages/NoAssignedRolePage';
import { homeForRoles } from '../../features/auth/roles';
import { CompleteAccountPage } from '../../features/invitations/pages/CompleteAccountPage';
import { InvitationsPage } from '../../features/invitations/pages/InvitationsPage';
import { StudentOnboardingPage } from '../../features/onboarding/pages/StudentOnboardingPage';
import { CreateGymPage } from '../../features/platform/pages/CreateGymPage';
import { GymsPage } from '../../features/platform/pages/GymsPage';
import { RoutineReviewPage } from '../../features/prescriptions/pages/RoutineReviewPage';
import { StudentRoutinePage } from '../../features/prescriptions/pages/StudentRoutinePage';
import { TemplatesPage } from '../../features/routine-templates/pages/TemplatesPage';
import { RoutineGenerationPanel } from '../../features/routine-generations/components/RoutineGenerationPanel';
import { ProposalReviewPage } from '../../features/adaptation-proposals/pages/ProposalReviewPage';
import { TrainerRoutinesPage } from '../../features/adaptation-proposals/pages/TrainerRoutinesPage';
import { StudentOverviewPage } from '../../features/routines/pages/StudentOverviewPage';
import { StudentDetailPage } from '../../features/students/pages/StudentDetailPage';
import { MeasurementBlockGate } from '../../features/students/components/MeasurementBlockGate';
import { TrainerPortfolioPage } from '../../features/students/pages/TrainerPortfolioPage';
import { TrainerStudentsListPage } from '../../features/students/pages/TrainerStudentsListPage';
import { PlaceholderPage } from '../../shared/ui/PlaceholderPage';
import { AppShell } from '../layout/AppShell';

function HomeForSession() {
  const { user } = useSession();
  return (
    <Navigate to={user ? homeForRoles(user.roles) : '/ingresar'} replace />
  );
}

function StudentOverviewRoute() {
  const { user } = useSession();
  return user ? <StudentOverviewPage studentId={user.id} /> : null;
}

function StudentOnboardingRoute() {
  const { user } = useSession();
  return user ? <StudentOnboardingPage studentId={user.id} /> : null;
}

function StudentRoutineRoute() {
  const { user } = useSession();
  return user ? (
    <StudentRoutinePage
      generationPanel={<RoutineGenerationPanel studentId={user.id} />}
    />
  ) : null;
}

/** Rutas protegidas por sesión, rol y bloqueo de mediciones cuando corresponde. */
export function AppRouter() {
  return (
    <Routes>
      {/* HU07-T6 y HU06-T5: el login y el completado de cuenta son las rutas
          públicas. La invitación es la credencial de quien todavía no tiene cuenta. */}
      <Route path="/ingresar" element={<LoginPage />} />
      <Route path="/invitacion/:token" element={<CompleteAccountPage />} />

      {/* HU07-T7: el resto exige sesión; sin ella se redirige al login. */}
      <Route element={<RequireSession />}>
        <Route path="/sin-acceso" element={<NoAssignedRolePage />} />
        <Route element={<AppShell />}>
          <Route path="/" element={<HomeForSession />} />

          {/* Alumno */}
          <Route element={<RequireRole role="ALUMNO" />}>
            {/* FL-01: a donde llega el alumno recién dado de alta (HU06). */}
            <Route
              path="/alumno/puesta-en-contexto"
              element={<StudentOnboardingRoute />}
            />
            <Route element={<MeasurementBlockGate />}>
              <Route path="/alumno" element={<StudentOverviewRoute />} />
              <Route path="/alumno/rutina" element={<StudentRoutineRoute />} />
              <Route
                path="/alumno/sesion"
                element={
                  <PlaceholderPage
                    kicker="Sesión en curso"
                    title="Espalda & Bíceps"
                    description="Registro de series, cargas y repeticiones de la sesión activa."
                  />
                }
              />
              <Route
                path="/alumno/progreso"
                element={
                  <PlaceholderPage
                    kicker="Progreso"
                    title="La tendencia juega a tu favor."
                    description="Evolución de fuerza, mapa muscular, mediciones y adherencia."
                  />
                }
              />
              <Route
                path="/alumno/historial"
                element={
                  <PlaceholderPage
                    kicker="Historial"
                    title="Tu entrenamiento, con contexto."
                    description="Sesiones realizadas, récords y rutinas archivadas."
                  />
                }
              />
              <Route path="/alumno/catalogo" element={<CatalogPage />} />
              <Route
                path="/alumno/perfil"
                element={
                  <PlaceholderPage
                    kicker="Mi perfil"
                    title="Tus datos de entrenamiento."
                    description="Objetivos, restricciones y mediciones declaradas."
                  />
                }
              />
            </Route>
          </Route>

          {/* Entrenador */}
          <Route element={<RequireRole role="ENTRENADOR" />}>
            <Route path="/entrenador" element={<TrainerPortfolioPage />} />
            <Route
              path="/entrenador/alumnos"
              element={<TrainerStudentsListPage />}
            />
            <Route
              path="/entrenador/alumnos/:studentId"
              element={<StudentDetailPage />}
            />
            <Route
              path="/entrenador/alumnos/:studentId/rutina"
              element={<StudentDetailPage />}
            />
            <Route
              path="/entrenador/alumnos/:studentId/mediciones"
              element={<StudentDetailPage />}
            />
            <Route
              path="/entrenador/rutinas"
              element={<TrainerRoutinesPage />}
            />
            <Route
              path="/entrenador/rutinas/revisar"
              element={<TrainerRoutinesPage />}
            />
            <Route
              path="/entrenador/rutinas/revisar/:proposalId"
              element={<ProposalReviewPage />}
            />
            <Route path="/entrenador/plantillas" element={<TemplatesPage />} />
            <Route path="/entrenador/catalogo" element={<CatalogPage />} />
            {/* HU17: revisión de una rutina propuesta desde la bandeja. */}
            <Route
              path="/entrenador/rutinas/propuestas/:studentId/:routineId"
              element={<RoutineReviewPage />}
            />
            {/* FL-19: el entrenador invita alumnos, que quedan asignados a él. */}
            <Route
              path="/entrenador/invitaciones"
              element={<InvitationsPage canChooseRoles={false} />}
            />
            <Route
              path="/entrenador/perfil"
              element={
                <PlaceholderPage
                  kicker="Mi perfil"
                  title="Tu perfil profesional."
                  description="Especialidad, experiencia y presentación visible para tu cartera."
                />
              }
            />
          </Route>

          {/* Administrador */}
          <Route element={<RequireRole role="ADMINISTRADOR" />}>
            <Route path="/admin" element={<AdminAnalyticsPage />} />
            {/* FL-19: el administrador invita con cualquier rol del gimnasio. */}
            <Route
              path="/admin/usuarios"
              element={<InvitationsPage canChooseRoles />}
            />
            <Route path="/admin/ejercicios" element={<CatalogPage manage />} />
            {/* RF-066: el administrador asigna entrenadores a los alumnos. */}
            <Route path="/admin/asignaciones" element={<AssignmentsPage />} />
            {/* FL-20: inventario del gimnasio. */}
            <Route path="/admin/inventario" element={<InventoryPage />} />
            <Route
              path="/admin/reglas"
              element={
                <PlaceholderPage
                  kicker="Reglas de cálculo"
                  title="Parámetros transparentes."
                  description="Ventanas de referencia de los indicadores de entrenamiento."
                />
              }
            />
            <Route
              path="/admin/configuracion"
              element={<GenerationSettingsPage />}
            />
          </Route>

          {/* SuperAdmin (HU13): sólo gestión de gimnasios. */}
          <Route element={<RequireRole role="SUPERADMIN" showDenied />}>
            <Route path="/superadmin" element={<GymsPage />} />
            <Route
              path="/superadmin/gimnasios/nuevo"
              element={<CreateGymPage />}
            />
          </Route>

          <Route path="*" element={<HomeForSession />} />
        </Route>
      </Route>
    </Routes>
  );
}
