import React from 'react';
import './Alert.css';

type AlertType = 'info' | 'success' | 'warning' | 'error';

interface AlertProps {
  type?: AlertType;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
}

export function Alert({ type = 'info', title, children, onClose }: AlertProps) {
  return (
    <div className={`alert alert--${type}`} role="alert">
      <div className="alert__icon" aria-hidden="true">
        {type === 'error' && '✕'}
        {type === 'warning' && '⚠'}
        {type === 'success' && '✓'}
        {type === 'info' && 'ℹ'}
      </div>
      <div className="alert__content">
        {title && <p className="alert__title">{title}</p>}
        <div className="alert__body">{children}</div>
      </div>
      {onClose && (
        <button className="alert__close" onClick={onClose} aria-label="סגור">
          ✕
        </button>
      )}
    </div>
  );
}
