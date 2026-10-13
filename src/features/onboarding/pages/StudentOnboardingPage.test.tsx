import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockApi } from '../../../../test/apiMocks';
import { StudentOnboardingPage } from './StudentOnboardingPage';

const STUDENT = '21000000-0000-4000-8000-000000000010';

const VACIO = {
  experienceLevel: null,
  availableDaysPerWeek: null,
  birthDate: null,
  sex: null,
  heightCm: null,
  weightKg: null,
  trainer: { id: '21000000-0000-4000-8000-000000000002', displayName: 'Lucía' },
  healthDataConsent: true,
  healthConsentText: 'Acepto el tratamiento de mis datos de salud.',
  complete: false,
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/alumno/puesta-en-contexto']}>
        <Routes>
          <Route
            path="/alumno/puesta-en-contexto"
            element={<StudentOnboardingPage studentId={STUDENT} />}
          />
          <Route path="/alumno" element={<p>Resumen del alumno</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StudentOnboardingPage (FL-01)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('pide los datos obligatorios campo por campo', async () => {
    const fetchMock = mockApi({
      'GET /students/me/context': { body: VACIO },
    });
    renderPage();

    fireEvent.click(
      await screen.findByRole('button', { name: 'Guardar y continuar' }),
    );

    expect(screen.getAllByText('Este dato es obligatorio.')).toHaveLength(7);
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT'),
    ).toBe(false);
  });

  it('guarda el contexto y el objetivo y lleva al resumen', async () => {
    const fetchMock = mockApi({
      'GET /students/me/context': { body: VACIO },
      'PUT /students/me/context': {
        body: {
          experienceLevel: 'PRINCIPIANTE',
          availableDaysPerWeek: 3,
          birthDate: '1995-05-20',
          sex: 'FEMENINO',
          heightCm: 165,
          weightKg: 62.5,
          trainer: null,
          healthDataConsent: true,
          healthConsentText: 'Acepto el tratamiento de mis datos de salud.',
          complete: true,
        },
      },
      [`POST /students/${STUDENT}/goals`]: { status: 201, body: {} },
    });
    renderPage();

    await screen.findByRole('form', { name: 'Puesta en contexto' });
    const elegir = (label: RegExp, value: string) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    };
    elegir(/Objetivo/, 'HIPERTROFIA');
    elegir(/Nivel de experiencia/, 'PRINCIPIANTE');
    elegir(/Días por semana/, '3');
    elegir(/Fecha de nacimiento/, '1995-05-20');
    elegir(/Sexo/, 'FEMENINO');
    elegir(/Altura/, '165');
    elegir(/Peso/, '62.5');
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar y continuar' }),
    );

    expect(await screen.findByText('Resumen del alumno')).toBeVisible();
    await waitFor(() => {
      const put = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'PUT',
      );
      expect(JSON.parse(String(put?.[1]?.body))).toEqual({
        experienceLevel: 'PRINCIPIANTE',
        availableDaysPerWeek: 3,
        birthDate: '1995-05-20',
        sex: 'FEMENINO',
        heightCm: 165,
        weightKg: 62.5,
      });
    });
  });

  it('muestra los rangos que rechaza el backend junto a cada campo', async () => {
    mockApi({
      'GET /students/me/context': {
        body: {
          experienceLevel: 'INTERMEDIO',
          availableDaysPerWeek: 4,
          birthDate: '2020-01-01',
          sex: 'MASCULINO',
          heightCm: 170,
          weightKg: 80,
          trainer: null,
          healthDataConsent: true,
          healthConsentText: 'Acepto el tratamiento de mis datos de salud.',
          complete: true,
        },
      },
      'PUT /students/me/context': {
        status: 422,
        body: {
          error: 'invalid_student_context',
          fields: { birthDate: ['La edad debe estar entre 14 y 100 años.'] },
        },
      },
    });
    renderPage();

    await screen.findByRole('form', { name: 'Puesta en contexto' });
    fireEvent.change(screen.getByLabelText(/Objetivo/), {
      target: { value: 'FUERZA' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar y continuar' }),
    );

    expect(
      await screen.findByText('La edad debe estar entre 14 y 100 años.'),
    ).toBeVisible();
    expect(screen.getByLabelText(/Fecha de nacimiento/)).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  it('muestra el profesor asignado, o que el gimnasio va a asignar uno', async () => {
    mockApi({ 'GET /students/me/context': { body: VACIO } });
    renderPage();

    expect(await screen.findByText('Lucía')).toBeVisible();
  });

  it('sin profesor explica que el gimnasio lo asigna', async () => {
    mockApi({
      'GET /students/me/context': { body: { ...VACIO, trainer: null } },
    });
    renderPage();

    expect(
      await screen.findByText(/El gimnasio te va a asignar uno/),
    ).toBeVisible();
  });

  it('RN-104: sin consentimiento lo pide y lo registra antes de guardar', async () => {
    const fetchMock = mockApi({
      'GET /students/me/context': {
        body: { ...VACIO, healthDataConsent: false },
      },
      'POST /students/me/health-consent': {
        status: 201,
        body: { ...VACIO, healthDataConsent: true },
      },
      'PUT /students/me/context': { body: { ...VACIO, complete: true } },
      [`POST /students/${STUDENT}/goals`]: { status: 201, body: {} },
    });
    renderPage();

    await screen.findByRole('form', { name: 'Puesta en contexto' });
    expect(
      screen.getByText('Acepto el tratamiento de mis datos de salud.'),
    ).toBeVisible();
    const elegir = (label: RegExp, value: string) => {
      fireEvent.change(screen.getByLabelText(label), { target: { value } });
    };
    elegir(/Objetivo/, 'FUERZA');
    elegir(/Nivel de experiencia/, 'PRINCIPIANTE');
    elegir(/Días por semana/, '3');
    elegir(/Fecha de nacimiento/, '1995-05-20');
    elegir(/^Sexo/, 'FEMENINO');
    elegir(/Altura/, '165');
    elegir(/Peso/, '60');
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar y continuar' }),
    );

    expect(
      screen.getByText(
        'Para guardar tu peso y tu altura necesitamos tu consentimiento.',
      ),
    ).toBeVisible();
    expect(
      fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT'),
    ).toBe(false);

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: 'Acepto el tratamiento de mis datos de salud.',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar y continuar' }),
    );

    expect(await screen.findByText('Resumen del alumno')).toBeVisible();
    const metodos = fetchMock.mock.calls
      .filter(([, init]) => init?.method && init.method !== 'GET')
      .map(([url, init]) => `${init?.method} ${new URL(String(url)).pathname}`);
    expect(metodos.slice(0, 2)).toEqual([
      'POST /students/me/health-consent',
      'PUT /students/me/context',
    ]);
  });
});
