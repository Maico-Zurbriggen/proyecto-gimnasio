import { useMutation } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';

import { fieldErrors } from '../../../api/client';
import { changePassword } from '../../../api/passwordRecovery';
import { Banner } from '../../../shared/components/Banner';
import { isPasswordStrong } from '../../../shared/lib/passwordStrength';
import { BentoCard } from '../../../shared/ui/BentoCard';
import { PageHeader } from '../../../shared/ui/PageHeader';
import {
  NewPasswordFields,
  validateNewPassword,
  type NewPasswordErrors,
} from '../components/NewPasswordFields';

/**
 * Cambio de contraseña con sesión (HU09 - RF-003, criterios front 11 y 12).
 * Sólo cambia la propia: no hay forma de indicar otro usuario. Las demás
 * sesiones se cierran y la actual sigue activa.
 */
export function ChangePasswordPage() {
  const [contrasena, setContrasena] = useState('');
  const [repeticion, setRepeticion] = useState('');
  const [errores, setErrores] = useState<NewPasswordErrors>({});
  const cambiar = useMutation({
    mutationFn: () => changePassword(contrasena),
    onSuccess: () => {
      setContrasena('');
      setRepeticion('');
    },
    onError: (error) => setErrores(fieldErrors(error)),
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (cambiar.isPending) return;
    const locales = validateNewPassword(
      contrasena,
      repeticion,
      isPasswordStrong,
    );
    setErrores(locales);
    if (Object.keys(locales).length > 0) return;
    cambiar.reset();
    cambiar.mutate();
  };

  return (
    <div>
      <PageHeader kicker="Mi cuenta" title="Cambiar contraseña." />
      <main className="px-4 pb-10 sm:px-7 lg:px-9">
        <BentoCard className="max-w-md">
          {cambiar.isSuccess ? (
            <div className="mb-4">
              <Banner variant="info" title="Contraseña actualizada">
                <p>
                  Seguís con esta sesión abierta; cerramos las demás por
                  seguridad.
                </p>
              </Banner>
            </div>
          ) : null}
          <form
            noValidate
            aria-label="Cambiar contraseña"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
            <NewPasswordFields
              password={contrasena}
              confirmation={repeticion}
              onPasswordChange={setContrasena}
              onConfirmationChange={setRepeticion}
              errors={errores}
            />
            {cambiar.isError && !errores.password ? (
              <p role="alert" className="text-coral-text text-xs font-semibold">
                No pudimos cambiar la contraseña. Intentá de nuevo.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={cambiar.isPending}
              aria-busy={cambiar.isPending}
              className="bg-graphite self-start rounded-full px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
            >
              {cambiar.isPending ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </form>
        </BentoCard>
      </main>
    </div>
  );
}
