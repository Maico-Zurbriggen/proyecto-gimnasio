import { Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { AdminAnalyticsPage } from '../../features/administration/pages/AdminAnalyticsPage';
import { RequireSession } from '../../features/auth/components/RequireSession';
import { LoginPage } from '../../features/auth/pages/LoginPage';
import { ProposalReviewPage } from '../../features/adaptation-proposals/pages/ProposalReviewPage';
import { TrainerRoutinesPage } from '../../features/adaptation-proposals/pages/TrainerRoutinesPage';
import { StudentOverviewPage } from '../../features/routines/pages/StudentOverviewPage';
import { StudentDetailPage } from '../../features/students/pages/StudentDetailPage';
import { TrainerPortfolioPage } from '../../features/students/pages/TrainerPortfolioPage';
import { TrainerStudentsListPage } from '../../features/students/pages/TrainerStudentsListPage';
import { PlaceholderPage } from '../../shared/ui/PlaceholderPage';
import { AppShell } from '../layout/AppShell';

function FallbackRedirect() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />;
  }
  if (pathname.startsWith('/entrenador')) {
    return <Navigate to="/entrenador" replace />;
  }
  return <Navigate to="/alumno" replace />;
}

/**
 * Rutas de la app. Las páginas listadas en `PlaceholderPage` son de
 * referencia visual y no ejecutan lógica real en este
 * sprint; solo el resumen del alumno (HU01), la revisión de propuesta
 * (HU04) y la ficha del alumno (HU05) están conectadas de verdad.
 */
export function AppRouter() {
  return (
    <Routes>
      {/* HU07-T6: el login es la única ruta pública. */}
      <Route path="/ingresar" element={<LoginPage />} />

      {/* HU07-T7: el resto exige sesión; sin ella se redirige al login. */}
      <Route element={<RequireSession />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/alumno" replace />} />

          {/* Alumno */}
          <Route path="/alumno" element={<StudentOverviewPage />} />
          <Route
            path="/alumno/rutina"
            element={
              <PlaceholderPage
                kicker="Mi rutina"
                title="Fuerza base · 4 días"
                description="Estructura semanal, días de rutina y cambios recientes."
              />
            }
          />
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
          <Route
            path="/alumno/catalogo"
            element={
              <PlaceholderPage
                kicker="Catálogo de ejercicios"
                title="Elegí con información."
                description="Explorá movimientos por grupo muscular, equipamiento y nivel."
              />
            }
          />
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

          {/* Entrenador */}
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
          <Route path="/entrenador/rutinas" element={<TrainerRoutinesPage />} />
          <Route
            path="/entrenador/rutinas/revisar"
            element={<TrainerRoutinesPage />}
          />
          <Route
            path="/entrenador/rutinas/revisar/:proposalId"
            element={<ProposalReviewPage />}
          />
          <Route
            path="/entrenador/plantillas"
            element={
              <PlaceholderPage
                kicker="Plantillas"
                title="Bases reutilizables, no rígidas."
                description="Composiciones de rutina que se pueden adaptar por alumno."
              />
            }
          />
          <Route
            path="/entrenador/catalogo"
            element={
              <PlaceholderPage
                kicker="Catálogo"
                title="Ejercicios para prescribir."
                description="Técnicas, músculos involucrados y equipamiento."
              />
            }
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

          {/* Administrador */}
          <Route path="/admin" element={<AdminAnalyticsPage />} />
          <Route
            path="/admin/usuarios"
            element={
              <PlaceholderPage
                kicker="Usuarios y roles"
                title="Personas, roles y estado."
                description="Gestión del acceso dentro del gimnasio."
              />
            }
          />
          <Route
            path="/admin/asignaciones"
            element={
              <PlaceholderPage
                kicker="Asignaciones"
                title="Entrenadores y alumnos."
                description="La relación vigente determina qué información ve cada entrenador."
              />
            }
          />
          <Route
            path="/admin/ejercicios"
            element={
              <PlaceholderPage
                kicker="Curación del catálogo"
                title="Ejercicios con criterio."
                description="Revisión de ejercicios propuestos antes de publicarlos."
              />
            }
          />
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
            element={
              <PlaceholderPage
                kicker="Configuración"
                title="Identidad del gimnasio."
                description="Información general y preferencias administrativas."
              />
            }
          />

          <Route path="*" element={<FallbackRedirect />} />
        </Route>
      </Route>
    </Routes>
  );
}
