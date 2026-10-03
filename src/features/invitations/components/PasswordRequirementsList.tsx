import { evaluatePasswordRequirements } from '../utils/passwordStrength';

export interface PasswordRequirementsListProps {
  password: string;
}

/**
 * Requisitos de la contraseña, marcados en vivo (HU06-T4). Se muestran los cuatro
 * desde el principio: la persona sabe qué tiene que cumplir antes de escribir, en
 * lugar de descubrirlo con un rechazo por intento.
 */
export function PasswordRequirementsList({
  password,
}: PasswordRequirementsListProps) {
  const requirements = evaluatePasswordRequirements(password);

  return (
    <ul
      aria-label="Requisitos de la contraseña"
      className="mt-1 flex flex-col gap-1.5 text-xs"
    >
      {requirements.map((requirement) => (
        <li
          key={requirement.id}
          data-testid={`req-${requirement.id}`}
          data-passed={requirement.passed}
          className={`flex items-center gap-2 font-medium ${
            requirement.passed ? 'text-[#4a6b1f]' : 'text-[#77756d]'
          }`}
        >
          <span
            aria-hidden="true"
            className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
              requirement.passed
                ? 'bg-lime-soft text-[#4a6b1f]'
                : 'bg-[#292823]/8 text-[#77756d]'
            }`}
          >
            {requirement.passed ? '✓' : '·'}
          </span>
          <span>{requirement.label}</span>
        </li>
      ))}
    </ul>
  );
}
