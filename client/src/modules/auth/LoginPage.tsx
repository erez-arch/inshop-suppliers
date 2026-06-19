import React, { useState } from 'react';
import { auth, AuthUser } from '../../services/api';
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
      <div className="login-card" role="main">
        {/* Brand header */}
        <div className="login-header">
          <div className="login-brand-mark" aria-hidden="true">🏪</div>
          <h1 className="login-title">INSHOP</h1>
          <p className="login-subtitle">מערכת ניהול ספקים ומלאי</p>
        </div>

        <div className="login-divider" role="separator" />

        {/* Error */}
        {error && (
          <div className="login-error" role="alert" aria-live="assertive">
            <span className="login-error__icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">דואר אלקטרוני</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="admin@inshop.local"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">סיסמה</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="login-submit"
            disabled={loading || !email || !password}
          >
            {loading ? (
              <>
                <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                מתחבר...
              </>
            ) : (
              'כניסה למערכת'
            )}
          </button>
        </form>

        {/* Dev hint */}
        <div className="login-hint" aria-label="פרטי כניסה לפיתוח">
          admin@inshop.local / admin123
        </div>
      </div>
    </div>
  );
}
