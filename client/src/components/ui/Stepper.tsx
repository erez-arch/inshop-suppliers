import React from 'react';
import './Stepper.css';

interface Step {
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number; // 0-indexed
}

export function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav className="stepper" aria-label="שלבי תהליך">
      <ol className="stepper__list">
        {steps.map((step, i) => {
          const state = i < currentStep ? 'done' : i === currentStep ? 'active' : 'upcoming';
          return (
            <li key={i} className={`stepper__item stepper__item--${state}`}>
              <span className="stepper__num" aria-hidden="true">
                {state === 'done' ? '✓' : i + 1}
              </span>
              <span className="stepper__label">{step.label}</span>
              {i < steps.length - 1 && <span className="stepper__connector" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
