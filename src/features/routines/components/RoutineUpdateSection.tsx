import { useEffect, useState } from 'react';

import {
  parseCandidateSummary,
  type CandidateSummary,
  type GenerationSnapshot,
} from '../../../api/routine-generations';
import { ApiError } from '../../../api/client';
import { Banner } from '../../../shared/components/Banner';
import { BentoCard } from '../../../shared/ui/BentoCard';
import {
  clearActiveGenerationId,
  loadActiveGenerationId,
  saveActiveGenerationId,
  useGenerationStatus,
  useLatestGeneration,
  useRequestRoutineUpdate,
} from '../hooks/useRoutineUpdate';

const STATUS_LABEL: Record<string, string> = {
  PENDIENTE: 'En cola',
  PROCESANDO: 'Generándose',
  COMPLETADA: 'Candidato listo',
  NO_DISPONIBLE: 'No disponible',
  CANCELADA: 'Cancelada',
};

const ROUTINE_TYPE_LABEL: Record<string, string> = {
  FUERZA: 'Fuerza',
  HIPERTROFIA: 'Hipertrofia',
  RESISTENCIA_MUSCULAR: 'Resistencia muscular',
  ACONDICIONAMIENTO_GENERAL: 'Acondicionamiento general',
};

const UNAVAILABLE_REASON: Record<string, string> = {
  llm_timeout: 'La generación tardó demasiado y se agotó el tiempo.',
  invalid_structured_output:
    'La generación no produjo una estructura válida para tu perfil.',
  llm_request_failed: 'El servicio de generación falló dos veces seguidas.',
};

function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}

function requestErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    switch (error.code) {
      case 'missing_generation_input':
        return 'Contanos qué querés cambiar de tu rutina antes de enviar.';
      case 'empty_prefiltered_catalog':
        return 'Tu gimnasio no tiene ejercicios compatibles para generarte una rutina ahora.';
      case 'ai_service_unavailable':
        return 'El servicio de generación no está disponible en este momento.';
      case 'student_not_found':
        return 'No encontramos tu perfil de alumno para generar la rutina.';
      default:
        break;
    }
    if (error.status === 401 || error.status === 403) {
      return 'Tu sesión no tiene permiso para esta consulta. Volvé a ingresar.';
    }
  }
  return 'No pudimos enviar tu solicitud. Probá de nuevo.';
}

function unavailableMessage(errorCode: string | null): string {
  if (errorCode) {
    const known = UNAVAILABLE_REASON[errorCode];
    if (known) {
      return known;
    }
  }
  return 'No pudimos generar una rutina para tu perfil en este momento.';
}

function CandidateSummaryView({ candidate }: { candidate: CandidateSummary }) {
  const days = candidate.days?.length;
  return (
    <div className="rounded-2xl border border-[#292823]/10 bg-white p-4">
      <p className="eyebrow text-[#77756d]">Candidato generado</p>
      <dl className="mt-2 space-y-1 text-sm">
        {candidate.routine_type ? (
          <div className="flex justify-between gap-2">
            <dt className="text-[#77756d]">Tipo</dt>
            <dd className="font-semibold">
              {ROUTINE_TYPE_LABEL[candidate.routine_type] ??
                candidate.routine_type}
            </dd>
          </div>
        ) : null}
        {candidate.target_weekly_frequency ? (
          <div className="flex justify-between gap-2">
            <dt className="text-[#77756d]">Frecuencia</dt>
            <dd className="font-semibold">
              {candidate.target_weekly_frequency} días por semana
            </dd>
          </div>
        ) : null}
        {days !== undefined ? (
          <div className="flex justify-between gap-2">
            <dt className="text-[#77756d]">Días de rutina</dt>
            <dd className="font-semibold">{days}</dd>
          </div>
        ) : null}
      </dl>
      {candidate.explanation ? (
        <p className="mt-3 text-sm leading-6 text-[#55534c]">
          {candidate.explanation.length > 300
            ? `${candidate.explanation.slice(0, 300)}…`
            : candidate.explanation}
        </p>
      ) : null}
    </div>
  );
}

function CompletedView({ snapshot }: { snapshot: GenerationSnapshot }) {
  const candidate = parseCandidateSummary(snapshot.estructuraCandidata);
  return (
    <div className="flex flex-col gap-3">
      {candidate ? (
        <CandidateSummaryView candidate={candidate} />
      ) : (
        <p className="text-sm leading-6">
          Tu candidato está listo y conserva el detalle completo para la
          revisión.
        </p>
      )}
      {snapshot.violaciones && snapshot.violaciones.length > 0 ? (
        <Banner variant="warning" title="El candidato tiene observaciones">
          <ul className="list-disc pl-5">
            {snapshot.violaciones.map((violation) => (
              <li key={violation}>{violation}</li>
            ))}
          </ul>
        </Banner>
      ) : null}
      <Banner variant="info" title="Pendiente de revisión">
        <p>
          Tu entrenador va a revisar este candidato antes de que entre en
          vigencia. Todavía no es tu rutina.
        </p>
      </Banner>
    </div>
  );
}

/**
 * Actualización de rutina del alumno desde su perfil (RF-025). Solicita,
 * sigue por polling hasta el estado terminal y muestra el candidato, que
 * nunca se presenta como vigente: entra en vigencia solo si el entrenador
 * lo aprueba.
 */
export function RoutineUpdateSection({ studentId }: { studentId: string }) {
  const [requestId, setRequestId] = useState<string | null>(() =>
    loadActiveGenerationId(studentId),
  );
  const [texto, setTexto] = useState('');
  const [vacio, setVacio] = useState(false);
  const [shouldRecoverLatest, setShouldRecoverLatest] = useState(
    () => loadActiveGenerationId(studentId) === null,
  );

  const request = useRequestRoutineUpdate(studentId);
  const latest = useLatestGeneration(
    studentId,
    requestId === null && shouldRecoverLatest,
  );

  useEffect(() => {
    const latestRequestId = latest.data?.requestId;
    if (
      requestId !== null ||
      !shouldRecoverLatest ||
      latestRequestId === undefined
    ) {
      return;
    }

    saveActiveGenerationId(studentId, latestRequestId);
    setShouldRecoverLatest(false);
    setRequestId(latestRequestId);
  }, [latest.data?.requestId, requestId, shouldRecoverLatest, studentId]);

  const track = (nextRequestId: string) => {
    saveActiveGenerationId(studentId, nextRequestId);
    setShouldRecoverLatest(false);
    setRequestId(nextRequestId);
  };

  const untrack = () => {
    clearActiveGenerationId(studentId);
    setShouldRecoverLatest(false);
    setRequestId(null);
    setTexto('');
    setVacio(false);
  };

  const submit = () => {
    if (texto.trim().length === 0) {
      setVacio(true);
      return;
    }
    setVacio(false);
    request.mutate(texto.trim(), {
      onSuccess: (response) => track(response.requestId),
    });
  };

  return (
    <section aria-labelledby="routine-update-title">
      <BentoCard>
        <p className="eyebrow text-[#77756d]">Rutina generada</p>
        <h2
          id="routine-update-title"
          className="font-display mt-2 text-2xl font-semibold tracking-[-0.06em]"
        >
          Actualizá tu rutina
        </h2>

        {requestId === null && shouldRecoverLatest && latest.isPending ? (
          <p role="status" className="mt-4 text-sm text-[#77756d]">
            Buscando tu última solicitud…
          </p>
        ) : requestId === null ? (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm leading-6 text-[#55534c]">
              Usamos tu perfil (objetivos, condiciones, nivel y días
              disponibles) para generarte una propuesta. Contanos qué querés
              cambiar.
            </p>
            <div>
              <label
                htmlFor="routine-update-text"
                className="mb-1 block text-xs font-bold"
              >
                ¿Qué querés cambiar de tu rutina?
              </label>
              <textarea
                id="routine-update-text"
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Por ejemplo: quiero ganar fuerza en piernas…"
                aria-describedby={
                  vacio ? 'routine-update-text-error' : undefined
                }
                className="w-full rounded-xl border border-[#292823]/15 bg-white p-3 text-sm leading-6 outline-none placeholder:text-[#b4b2a9] focus:border-graphite"
              />
              {vacio ? (
                <p
                  id="routine-update-text-error"
                  role="alert"
                  className="mt-1 text-xs font-semibold text-[#7a2a20]"
                >
                  Escribí qué querés cambiar antes de enviar.
                </p>
              ) : null}
            </div>
            {request.isError ? (
              <Banner variant="danger" title="No pudimos enviar tu solicitud">
                <p>{requestErrorMessage(request.error)}</p>
              </Banner>
            ) : null}
            <div>
              <button
                type="button"
                onClick={submit}
                disabled={request.isPending}
                className="rounded-full bg-graphite px-4 py-2 text-xs font-bold text-white transition hover:brightness-110 disabled:opacity-60"
              >
                {request.isPending ? 'Enviando…' : 'Solicitar actualización'}
              </button>
            </div>
          </div>
        ) : (
          <TrackingView
            studentId={studentId}
            requestId={requestId}
            onNewRequest={untrack}
          />
        )}
      </BentoCard>
    </section>
  );
}

function TrackingView({
  studentId,
  requestId,
  onNewRequest,
}: {
  studentId: string;
  requestId: string;
  onNewRequest: () => void;
}) {
  const status = useGenerationStatus(studentId, requestId);

  if (status.isPending) {
    return (
      <p role="status" className="mt-4 text-sm text-[#77756d]">
        Consultando el estado de tu solicitud…
      </p>
    );
  }

  if (status.isError) {
    return (
      <div className="mt-4">
        <Banner
          variant="danger"
          title="No pudimos consultar tu solicitud"
          actions={
            <>
              <button
                type="button"
                onClick={() => void status.refetch()}
                className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
              >
                Reintentar
              </button>
              <button
                type="button"
                onClick={onNewRequest}
                className="rounded-full border border-[#292823]/15 px-3.5 py-1.5 text-xs font-bold transition hover:bg-black/5"
              >
                Empezar de nuevo
              </button>
            </>
          }
        >
          <p>{requestErrorMessage(status.error)}</p>
        </Banner>
      </div>
    );
  }

  const snapshot = status.data;

  if (snapshot.status === 'COMPLETADA') {
    return (
      <div className="mt-4 flex flex-col gap-3">
        <p role="status" className="text-sm font-bold">
          Estado: {statusLabel(snapshot.status)}
        </p>
        <CompletedView snapshot={snapshot} />
        <div>
          <button
            type="button"
            onClick={onNewRequest}
            className="rounded-full border border-[#292823]/15 px-4 py-2 text-xs font-bold transition hover:bg-black/5"
          >
            Solicitar otra actualización
          </button>
        </div>
      </div>
    );
  }

  if (snapshot.status === 'NO_DISPONIBLE') {
    return (
      <div className="mt-4">
        <Banner
          variant="danger"
          title="No pudimos generar tu rutina"
          actions={
            <button
              type="button"
              onClick={onNewRequest}
              className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
            >
              Reintentar
            </button>
          }
        >
          <p>{unavailableMessage(snapshot.error)}</p>
          <p>
            Tu rutina vigente sigue igual. Si el problema continúa, avisale a tu
            entrenador.
          </p>
        </Banner>
      </div>
    );
  }

  if (snapshot.status === 'CANCELADA') {
    return (
      <div className="mt-4">
        <Banner
          variant="info"
          title="Solicitud cancelada"
          actions={
            <button
              type="button"
              onClick={onNewRequest}
              className="rounded-full bg-graphite px-3.5 py-1.5 text-xs font-bold text-white transition hover:brightness-110"
            >
              Solicitar de nuevo
            </button>
          }
        >
          <p>Esta solicitud se canceló y no generó ningún candidato.</p>
        </Banner>
      </div>
    );
  }

  return (
    <div className="mt-4 flex flex-col gap-3">
      <p role="status" className="text-sm leading-6">
        Estado: <strong>{statusLabel(snapshot.status)}</strong>. Estamos
        generando tu propuesta desde tu perfil; podés salir y volver más tarde.
      </p>
      <div>
        <button
          type="button"
          onClick={onNewRequest}
          className="rounded-full border border-[#292823]/15 px-4 py-2 text-xs font-bold transition hover:bg-black/5"
        >
          Dejar de seguir en este dispositivo
        </button>
      </div>
    </div>
  );
}
