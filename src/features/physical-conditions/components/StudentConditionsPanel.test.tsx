import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi, renderRoute } from '../../../../test/apiMocks';
import { StudentConditionsPanel } from './StudentConditionsPanel';

const ALUMNO = '11000000-0000-4000-8000-000000000001';
const BASE = `/students/${ALUMNO}/conditions`;

const ESTADO = {
  healthDataConsent: true,
  declaredNone: false,
  declaredNoneAt: null,
  activeCount: 0,
};

const RODILLA = {
  id: '51000000-0000-4000-8000-000000000001',
  studentId: ALUMNO,
  bodyZoneCode: 'RODILLA',
  severity: 'MODERADA',
  description: 'Molestia al bajar escaleras',
  startsOn: '2026-10-01',
  endsOn: null,
  vigente: true,
};

const HOMBRO_CERRADA = {
  ...RODILLA,
  id: '51000000-0000-4000-8000-000000000002',
  bodyZoneCode: 'HOMBRO',
  severity: 'LEVE',
  description: null,
  startsOn: '2026-08-01',
  endsOn: '2026-09-01',
  vigente: false,
};

function renderPanel() {
  return renderRoute(
    '/alumno/perfil',
    '/alumno/perfil',
    <StudentConditionsPanel studentId={ALUMNO} />,
  );
}

describe('StudentConditionsPanel (HU11 - T3)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sin consentimiento no habilita el formulario y permite otorgarlo', async () => {
    let consintio = false;
    const fetchMock = mockApi({
      [`GET ${BASE}/status`]: () => ({
        body: { ...ESTADO, healthDataConsent: consintio },
      }),
      [`GET ${BASE}`]: { body: [] },
      'POST /students/me/health-consent': () => {
        consintio = true;
        return {
          body: {
            experienceLevel: null,
            availableDaysPerWeek: null,
            birthDate: null,
            sex: null,
            heightCm: null,
            weightKg: null,
            trainer: null,
            healthDataConsent: true,
            healthConsentText: 'Acepto el tratamiento de mis datos de salud.',
            complete: false,
          },
        };
      },
    });
    renderPanel();

    expect(
      await screen.findByText(/necesitamos tu consentimiento/),
    ).toBeVisible();
    expect(
      screen.queryByRole('form', { name: 'Declarar una condición física' }),
    ).toBeNull();
    // Sin consentimiento ni siquiera se pide el listado.
    expect(
      fetchMock.mock.calls.some(([url]) => String(url).endsWith(BASE)),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole('button', { name: 'Dar mi consentimiento' }),
    );

    expect(
      await screen.findByRole('form', {
        name: 'Declarar una condición física',
      }),
    ).toBeVisible();
  });

  it('distingue no haber respondido de declarar que no hay ninguna', async () => {
    let declaro = false;
    mockApi({
      [`GET ${BASE}/status`]: () => ({
        body: {
          ...ESTADO,
          declaredNone: declaro,
          declaredNoneAt: declaro ? '2026-10-13T12:00:00.000Z' : null,
        },
      }),
      [`GET ${BASE}`]: { body: [] },
      [`POST ${BASE}/none`]: () => {
        declaro = true;
        return {
          body: {
            ...ESTADO,
            declaredNone: true,
            declaredNoneAt: '2026-10-13T12:00:00.000Z',
          },
        };
      },
    });
    renderPanel();

    expect(await screen.findByText(/Todavía no respondiste/)).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'No tengo ninguna condición física' }),
    );

    expect(
      await screen.findByText(/Declaraste que no tenés ninguna condición/),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', {
        name: 'No tengo ninguna condición física',
      }),
    ).toBeNull();
  });

  it('valida los campos obligatorios y advierte antes de declarar', async () => {
    let declaradas: unknown[] = [];
    const fetchMock = mockApi({
      [`GET ${BASE}/status`]: { body: ESTADO },
      [`GET ${BASE}`]: () => ({ body: declaradas }),
      [`POST ${BASE}`]: () => {
        declaradas = [RODILLA];
        return { status: 201, body: RODILLA };
      },
    });
    renderPanel();

    const form = await screen.findByRole('form', {
      name: 'Declarar una condición física',
    });
    fireEvent.click(
      within(form).getByRole('button', { name: 'Declarar condición' }),
    );
    expect(within(form).getByText('Elegí la zona corporal.')).toBeVisible();
    expect(within(form).getByText('Elegí la severidad.')).toBeVisible();

    fireEvent.change(within(form).getByLabelText(/Zona corporal/), {
      target: { value: 'RODILLA' },
    });
    fireEvent.change(within(form).getByLabelText(/Severidad/), {
      target: { value: 'MODERADA' },
    });
    fireEvent.click(
      within(form).getByRole('button', { name: 'Declarar condición' }),
    );

    // Criterio front 7: el efecto se informa antes de confirmar.
    const aviso = within(form).getByRole('alertdialog');
    expect(
      within(aviso).getByText(/puede marcar ejercicios de tu rutina/),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith(BASE),
      ),
    ).toBe(false);
    fireEvent.click(
      within(aviso).getByRole('button', { name: 'Confirmar declaración' }),
    );

    // El listado se actualiza sin recargar.
    expect(await screen.findByText('Severidad: Moderada')).toBeVisible();
    const vigentes = screen.getByText('Vigentes').closest('section');
    expect(within(vigentes as HTMLElement).getByText('Rodilla')).toBeVisible();
  });

  it('lista vigentes e historial, y cierra una vigente con confirmación', async () => {
    let cerrada = false;
    mockApi({
      [`GET ${BASE}/status`]: { body: { ...ESTADO, activeCount: 1 } },
      [`GET ${BASE}`]: () => ({
        body: [
          cerrada ? { ...RODILLA, endsOn: '2026-10-13' } : RODILLA,
          HOMBRO_CERRADA,
        ],
      }),
      [`POST ${BASE}/${RODILLA.id}/close`]: () => {
        cerrada = true;
        return { body: { ...RODILLA, endsOn: '2026-10-13' } };
      },
    });
    renderPanel();

    const vigentes = (await screen.findByText('Vigentes')).closest('section');
    const historial = screen.getByText('Historial').closest('section');
    expect(within(vigentes as HTMLElement).getByText('Rodilla')).toBeVisible();
    expect(within(historial as HTMLElement).getByText('Hombro')).toBeVisible();
    expect(
      within(historial as HTMLElement).queryByRole('button', {
        name: 'Cerrar condición',
      }),
    ).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Cerrar condición' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cerrar' }));

    expect(
      await screen.findByText('No hay condiciones vigentes.'),
    ).toBeVisible();
  });

  it('una condición declarada hoy se puede cerrar recién mañana', async () => {
    const hoy = new Date().toISOString().slice(0, 10);
    mockApi({
      [`GET ${BASE}/status`]: { body: { ...ESTADO, activeCount: 1 } },
      [`GET ${BASE}`]: { body: [{ ...RODILLA, startsOn: hoy }] },
    });
    renderPanel();

    expect(
      await screen.findByText(
        'La declaraste hoy: podés cerrarla desde mañana.',
      ),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Cerrar condición' }),
    ).toBeNull();
  });

  it('ofrece reintentar si falla la carga', async () => {
    mockApi({
      [`GET ${BASE}/status`]: { status: 500, body: { error: 'internal' } },
    });
    renderPanel();

    expect(
      await screen.findByText('No pudimos cargar tus condiciones.'),
    ).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible();
  });
});
