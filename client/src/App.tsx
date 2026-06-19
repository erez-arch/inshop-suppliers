import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { auth, AuthUser } from './services/api';
import { AdminLayout } from './components/Layout/AdminLayout';

// Lazy-load pages to keep initial bundle small
const LoginPage = React.lazy(() => import('./modules/auth/LoginPage'));
const DeliveriesListPage = React.lazy(() => import('./modules/admin/DeliveriesList'));
const DeliveryDetailPage = React.lazy(() => import('./modules/admin/DeliveryDetail'));
const SuppliersPage = React.lazy(() => import('./modules/master/SuppliersPage'));
const BranchesPage = React.lazy(() => import('./modules/master/BranchesPage'));
const ItemsPage = React.lazy(() => import('./modules/master/ItemsPage'));
const TrusteesPage = React.lazy(() => import('./modules/master/TrusteesPage'));
const InventoryPage = React.lazy(() => import('./modules/inventory/InventoryPage'));
const OrderRulesPage = React.lazy(() => import('./modules/order-rules/OrderRulesPage'));
const PaymentsPage = React.lazy(() => import('./modules/payments/PaymentsPage'));
const SupplierWizardPage = React.lazy(() => import('./modules/deliveries/SupplierWizardPage'));
const TrusteeWizardPage = React.lazy(() => import('./modules/deliveries/TrusteeWizardPage'));
const PortalPage = React.lazy(() => import('./modules/portal/PortalPage'));

function LoadingScreen() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        flexDirection: 'column',
        gap: '1rem',
        color: 'var(--color-text-secondary)',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: '4px solid var(--color-border)',
          borderTopColor: 'var(--color-primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p>טוען...</p>
    </div>
  );
}

interface ProtectedRouteProps {
  user: AuthUser | null;
  loading: boolean;
  children: React.ReactNode;
}

function ProtectedRoute({ user, loading, children }: ProtectedRouteProps) {
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    auth
      .me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  const handleLogout = useCallback(() => setUser(null), []);

  return (
    <BrowserRouter>
      <React.Suspense fallback={<LoadingScreen />}>
        <Routes>
          {/* Public mobile routes */}
          <Route path="/supplier-wizard" element={<SupplierWizardPage />} />
          <Route path="/trustee/:deliveryId" element={<TrusteeWizardPage />} />
          <Route path="/portal" element={<PortalPage />} />

          {/* Auth */}
          <Route
            path="/login"
            element={
              !authLoading && user ? (
                <Navigate to="/admin/deliveries" replace />
              ) : (
                <LoginPage onLogin={setUser} />
              )
            }
          />

          {/* Admin — requires auth */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute user={user} loading={authLoading}>
                <AdminLayout user={user!} onLogout={handleLogout} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="deliveries" replace />} />
            <Route path="deliveries" element={<DeliveriesListPage />} />
            <Route path="deliveries/:id" element={<DeliveryDetailPage />} />
            <Route path="suppliers" element={<SuppliersPage />} />
            <Route path="branches" element={<BranchesPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="trustees" element={<TrusteesPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="order-rules" element={<OrderRulesPage />} />
            <Route path="payments" element={<PaymentsPage />} />
          </Route>

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/admin/deliveries" replace />} />
          <Route path="*" element={<Navigate to="/admin/deliveries" replace />} />
        </Routes>
      </React.Suspense>
    </BrowserRouter>
  );
}
