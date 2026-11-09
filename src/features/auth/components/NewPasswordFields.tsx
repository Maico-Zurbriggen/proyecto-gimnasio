import { useId, useState } from 'react';

import { PasswordRequirementsList } from '../../../shared/components/PasswordRequirementsList';
import { LARGO_MAXIMO_CONTRASENA } from '../../../shared/lib/passwordStrength';

export interface NewPasswordErrors {
  password?: string[];
  confirmation?: string[];
}

/**
 * Nueva contraseña con confirmación, control para mostrar u ocultar y los
 * requisitos visibles antes de enviar (HU09 - criterios front 5 y 6). Los
 * errores van junto a cada campo, con texto además del color.
 */
export function NewPasswordFields({
  password,
  confirmation,
  onPasswordChange,
  onConfirmationChange,
  errors,
}: {
  password: string;
  confirmation: string;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  errors: NewPasswordErrors;
}) {
  const ids = useId();
  const [visible, setVisible] = useState(false);
  const idNueva = `${ids}-nueva`;
  const idRepeticion = `${ids}-repeticion`;
  const idRequisitos = `${ids}-requisitos`;

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={idNueva} className="field-label">
            Contraseña nueva <span aria-hidden="true">*</span>
          </label>
          <button
            type="button"
            aria-pressed={visible}
            aria-controls={`${idNueva} ${idRepeticion}`}
            onClick={() => setVisible((v) => !v)}
            className="btn-ghost btn-sm"
          >
            {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          </button>
        </div>
        <input
          id={idNueva}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          aria-required="true"
          maxLength={LARGO_MAXIMO_CONTRASENA}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={[
            idRequisitos,
            errors.password ? `${idNueva}-error` : '',
          ]
            .filter(Boolean)
            .join(' ')}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
          className="field"
        />
        {errors.password ? (
          <ul
            id={`${idNueva}-error`}
            className="text-coral-text flex flex-col gap-0.5 text-xs font-semibold"
          >
            {errors.password.map((mensaje) => (
              <li key={mensaje}>
                <span aria-hidden="true">✕ </span>
                {mensaje}
              </li>
            ))}
          </ul>
        ) : null}
        <div id={idRequisitos}>
          <PasswordRequirementsList password={password} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={idRepeticion} className="field-label">
          Repetí la contraseña <span aria-hidden="true">*</span>
        </label>
        <input
          id={idRepeticion}
          type={visible ? 'text' : 'password'}
          autoComplete="new-password"
          required
          aria-required="true"
          maxLength={LARGO_MAXIMO_CONTRASENA}
          aria-invalid={errors.confirmation ? true : undefined}
          aria-describedby={
            errors.confirmation ? `${idRepeticion}-error` : undefined
          }
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
          className="field"
        />
        {errors.confirmation ? (
          <p
            id={`${idRepeticion}-error`}
            className="text-coral-text text-xs font-semibold"
          >
            <span aria-hidden="true">✕ </span>
            {errors.confirmation.join(' ')}
          </p>
        ) : null}
      </div>
    </>
  );
}

/** Validación local previa; la definitiva es del backend. */
export function validateNewPassword(
  password: string,
  confirmation: string,
  isStrong: (value: string) => boolean,
): NewPasswordErrors {
  const errors: NewPasswordErrors = {};
  if (!password) errors.password = ['Elegí una contraseña.'];
  else if (!isStrong(password))
    errors.password = ['La contraseña todavía no cumple todos los requisitos.'];
  if (password && password !== confirmation)
    errors.confirmation = ['Las contraseñas no coinciden.'];
  return errors;
}
