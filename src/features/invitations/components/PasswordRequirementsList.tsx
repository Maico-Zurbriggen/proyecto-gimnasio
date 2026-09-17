import type { FC } from 'react';

import { evaluatePasswordRequirements } from '../utils/passwordStrength';

interface PasswordRequirementsListProps {
  password: string;
}

export const PasswordRequirementsList: FC<PasswordRequirementsListProps> = ({
  password,
}) => {
  const requirements = evaluatePasswordRequirements(password);

  return (
    <ul
      className="password-requirements-list"
      style={{
        listStyle: 'none',
        padding: 0,
        margin: '8px 0 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '0.8125rem',
      }}
      aria-label="Requisitos de la contraseña"
    >
      {requirements.map((req) => (
        <li
          key={req.id}
          data-testid={`req-${req.id}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: req.passed ? '#10b981' : '#94a3b8',
            transition: 'color 0.2s ease',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: req.passed
                ? 'rgba(16, 185, 129, 0.15)'
                : 'rgba(148, 163, 184, 0.15)',
              color: req.passed ? '#10b981' : '#64748b',
            }}
          >
            {req.passed ? '✓' : '•'}
          </span>
          <span>{req.label}</span>
        </li>
      ))}
    </ul>
  );
};
