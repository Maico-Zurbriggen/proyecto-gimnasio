import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderRoute } from '../../../test/apiMocks';
import { ApiError } from '../../api/client';
import { CatalogPage } from './CatalogPage';
const fixtures = vi.hoisted(() => ({
  user: { id: 'actor', gymId: 'gym', roles: ['ALUMNO'] },
  list: vi.fn(),
  taxonomies: vi.fn(),
  inventory: vi.fn(),
  availability: vi.fn(),
  review: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  setInventory: vi.fn(),
}));
vi.mock('../auth/hooks/useSession', () => ({
  useSession: () => ({ user: fixtures.user }),
}));
vi.mock('../../api/catalog', async () => {
  const actual =
    await vi.importActual<typeof import('../../api/catalog')>(
      '../../api/catalog',
    );
  return {
    ...actual,
    listCatalog: fixtures.list,
    getTaxonomies: fixtures.taxonomies,
    getInventory: fixtures.inventory,
    setAvailability: fixtures.availability,
    reviewExercise: fixtures.review,
    createExercise: fixtures.create,
    updateExercise: fixtures.update,
    setInventory: fixtures.setInventory,
  };
});
const exercise = {
  id: 'exercise-1',
  name: 'Ejercicio sintético',
  description: 'Ficha de prueba',
  instructions: 'Técnica original <script> sin HTML ejecutable.',
  tips: ['Consejo de prueba'],
  movementPattern: 'CORE',
  difficultyLevel: 'AVANZADO',
  unilateral: false,
  primaryMuscles: ['GLUTEO', 'CUADRICEPS'],
  secondaryMuscles: [],
  equipment: ['PESO_CORPORAL'],
  joints: ['HOMBRO'],
  media: [{ pose: 'PRINCIPAL', url: 'https://example.test/image.webp' }],
  origin: 'CATALOGO_BASE',
  state: 'APROBADO',
  source: 'RepDB',
  authorUserId: null,
  revision: 1,
  enabled: false,
  availabilityRevision: null,
  availabilityUpdatedAt: null,
  updatedAt: '2026-10-05T00:00:00Z',
  reviewObservation: null,
};
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  fixtures.user.roles = ['ALUMNO'];
  fixtures.list.mockResolvedValue({
    items: [exercise],
    page: 1,
    pageSize: 24,
    total: 1,
  });
  fixtures.taxonomies.mockResolvedValue({
    muscles: [
      { code: 'GLUTEO', name: 'Primario uno' },
      { code: 'CUADRICEPS', name: 'Primario dos' },
    ],
    equipment: [{ code: 'PESO_CORPORAL', name: 'Peso corporal' }],
    joints: [{ code: 'HOMBRO', name: 'Hombro' }],
  });
  fixtures.inventory.mockResolvedValue({
    equipment: ['PESO_CORPORAL'],
    updatedAt: null,
    revision: 0,
  });
  fixtures.availability.mockResolvedValue({ changed: 1 });
});
describe('Catalogue workflows by role', () => {
  it('enables an own exercise on approval only when the administrator explicitly selects it', async () => {
    fixtures.user.roles = ['ADMINISTRADOR'];
    const own = {
      ...exercise,
      origin: 'GIMNASIO',
      state: 'PROPUESTO',
      authorUserId: 'trainer',
    };
    fixtures.list.mockResolvedValue({
      items: [own],
      page: 1,
      pageSize: 24,
      total: 1,
    });
    fixtures.review.mockResolvedValue({
      ...own,
      state: 'APROBADO',
      revision: 2,
      enabled: true,
    });
    renderRoute('/catalogo', '/catalogo', <CatalogPage manage />);
    fireEvent.click(
      await screen.findByRole('button', { name: /Ejercicio sintético/ }),
    );
    const enable = screen.getByLabelText('Habilitar en el gimnasio al aprobar');
    expect(enable).not.toBeChecked();
    fireEvent.click(enable);
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar ficha' }));
    await waitFor(() =>
      expect(fixtures.review).toHaveBeenCalledWith(exercise.id, {
        expectedRevision: 1,
        state: 'APROBADO',
        observation: null,
        enable: true,
      }),
    );
    await screen.findByText('Ficha aprobada y habilitada en el gimnasio.');
  });
  it('shows technique, multiple primary muscles and attribution without administrator actions', async () => {
    renderRoute('/catalogo', '/catalogo', <CatalogPage />);
    await screen.findByText(exercise.name);
    expect(
      screen.queryByLabelText('Disponible en el gimnasio'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Proponer ejercicio propio'),
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: /Ejercicio sintético/ }),
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('img', { name: /Mapa muscular/ })).toBeVisible();
    expect(screen.getByText(exercise.instructions)).toBeVisible();
    expect(screen.getAllByText('Primario uno, Primario dos')).toHaveLength(2);
    expect(fixtures.list).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: 'true' }),
      expect.any(AbortSignal),
    );
  });
  it('keeps assignments explicit and saves a batch with the revision that was displayed', async () => {
    fixtures.user.roles = ['ADMINISTRADOR'];
    renderRoute('/catalogo', '/catalogo', <CatalogPage manage />);
    const checkbox = await screen.findByLabelText('Disponible en el gimnasio');
    expect(checkbox).not.toBeChecked();
    expect(fixtures.availability).not.toHaveBeenCalled();
    fireEvent.click(checkbox);
    expect(screen.getByText('1 cambios sin guardar')).toBeVisible();
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar disponibilidad' }),
    );
    await waitFor(() =>
      expect(fixtures.availability).toHaveBeenCalledWith([
        { exerciseId: exercise.id, enabled: true, expectedRevision: null },
      ]),
    );
    await screen.findByText('1 cambios de disponibilidad guardados.');
  });
  it('retains the draft when another administrator changes availability', async () => {
    fixtures.user.roles = ['ADMINISTRADOR'];
    fixtures.availability.mockRejectedValue(
      new ApiError(409, 'availability_conflict'),
    );
    renderRoute('/catalogo', '/catalogo', <CatalogPage manage />);
    fireEvent.click(await screen.findByLabelText('Disponible en el gimnasio'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Guardar disponibilidad' }),
    );
    await screen.findByText(/La disponibilidad cambió/);
    expect(screen.getByLabelText('Disponible en el gimnasio')).toBeChecked();
    expect(screen.getByText('1 cambios sin guardar')).toBeVisible();
  });
  it('explains an empty gym and lets trainers propose an exercise for review', async () => {
    fixtures.user.roles = ['ENTRENADOR'];
    fixtures.list.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 24,
      total: 0,
    });
    renderRoute('/catalogo', '/catalogo', <CatalogPage />);
    await screen.findByText(/El administrador debe habilitar ejercicios/);
    fireEvent.click(
      screen.getByRole('button', { name: 'Proponer ejercicio propio' }),
    );
    expect(
      screen.getByRole('form', { name: 'Proponer ejercicio propio' }),
    ).toBeVisible();
    expect(
      screen.getByText(/requiere revisión del administrador/),
    ).toBeVisible();
    expect(fixtures.create).not.toHaveBeenCalled();
  });
});
