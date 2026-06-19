import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export function Card({ children, className = '', title, actions, noPadding }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card__header">
          {title && <h3 className="card__title">{title}</h3>}
          {actions && <div className="card__actions">{actions}</div>}
        </div>
      )}
      <div className={`card__body ${noPadding ? 'card__body--no-padding' : ''}`}>{children}</div>
    </div>
  );
}
