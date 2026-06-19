import React, { useState } from 'react';
import { auth, AuthUser } from '../../services/api';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import './login.css';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await auth.login(email, password);
      onLogin(user);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'שגיאת התחברות';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-header">
          <span className="login-logo">🏪</span>
          <h1 className="login-title">INSHOP ספקים</h1>
          <p className="login-subtitle">ניהול ספקים ומלאי</p>
        </div>

        {error && (
          <Alert type="error" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              דואר אלקטרוני
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@inshop.local"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={loading}
            style={{ width: '100%', marginTop: '1rem' }}
          >
            כניסה למערכת
          </Button>
        </form>

        <p className="login-hint text-secondary text-sm">
          פיתוח: admin@inshop.local / admin123
        </p>
      </div>
    </div>
  );
}
