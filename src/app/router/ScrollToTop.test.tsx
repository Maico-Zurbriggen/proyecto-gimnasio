import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Link, MemoryRouter, useNavigate } from 'react-router-dom';

import { ScrollToTop } from './ScrollToTop';

const inbox = '/entrenador/rutinas/revisar';

function Navigation() {
  const navigate = useNavigate();
  return (
    <>
      <Link to={`${inbox}/proposal-1`}>Abrir propuesta</Link>
      <Link to={`${inbox}?alumno=1`}>Filtrar alumno</Link>
      <Link to="/entrenador/alumnos/student-1/rutina#manual-routine-editor">
        Editar ejercicio
      </Link>
      <button type="button" onClick={() => navigate(-1)}>
        Volver
      </button>
    </>
  );
}

function renderNavigation() {
  const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  render(
    <MemoryRouter initialEntries={[inbox]}>
      <ScrollToTop />
      <Navigation />
    </MemoryRouter>,
  );
  return scrollTo;
}

afterEach(() => vi.restoreAllMocks());

describe('ScrollToTop', () => {
  it('starts the proposal at the top when opened from the inbox', () => {
    const scrollTo = renderNavigation();
    fireEvent.click(screen.getByRole('link', { name: 'Abrir propuesta' }));

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
      top: 0,
      left: 0,
      behavior: 'instant',
    });
  });

  it('leaves scroll restoration to the browser when returning through history', () => {
    const scrollTo = renderNavigation();
    fireEvent.click(screen.getByRole('link', { name: 'Abrir propuesta' }));
    scrollTo.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Volver' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('preserves navigation to the manual editor anchor', () => {
    const scrollTo = renderNavigation();
    fireEvent.click(screen.getByRole('link', { name: 'Editar ejercicio' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('preserves the position when only an inbox filter changes', () => {
    const scrollTo = renderNavigation();
    fireEvent.click(screen.getByRole('link', { name: 'Filtrar alumno' }));

    expect(scrollTo).not.toHaveBeenCalled();
  });
});
