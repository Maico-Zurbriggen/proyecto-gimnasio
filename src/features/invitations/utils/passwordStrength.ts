export interface PasswordRequirement {
  id: string;
  label: string;
  passed: boolean;
}

/**
 * Requisitos de la contraseña, evaluados uno por uno (HU06-T4).
 *
 * Replican los que valida el backend en `password-strength.service`. Se duplican
 * a propósito: acá sirven para mostrar la lista en vivo mientras la persona
 * escribe, y el servidor sigue siendo el que decide. Si cambian allá, cambian acá.
 */
export function evaluatePasswordRequirements(
  password: string,
): PasswordRequirement[] {
  return [
    {
      id: 'min-length',
      label: 'Al menos 8 caracteres',
      passed: password.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'Una letra mayúscula',
      passed: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Una letra minúscula',
      passed: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Un número',
      passed: /[0-9]/.test(password),
    },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return evaluatePasswordRequirements(password).every((req) => req.passed);
}
