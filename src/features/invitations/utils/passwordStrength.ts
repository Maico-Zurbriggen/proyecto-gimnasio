export interface PasswordRequirement {
  id: string;
  label: string;
  passed: boolean;
}

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
      label: 'Una letra mayúscula (A-Z)',
      passed: /[A-Z]/.test(password),
    },
    {
      id: 'lowercase',
      label: 'Una letra minúscula (a-z)',
      passed: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Un número (0-9)',
      passed: /[0-9]/.test(password),
    },
  ];
}

export function isPasswordStrong(password: string): boolean {
  return evaluatePasswordRequirements(password).every((req) => req.passed);
}
