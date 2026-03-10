import React from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import OfficeView from './pages/OfficeView';
import ProductionView from './pages/ProductionView';
import { DashboardView } from './pages/DashboardView';
import { LoginView } from './pages/LoginView';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Package, TrendingUp, LogOut, BarChart2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: 'Office' | 'Production' }) => {
  const { user, token, isLoading } = useAuth();

  if (isLoading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Caricamento...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user) {
    if (allowedRole === 'Production' && user.role === 'Office') {
      // Office can view Production
    } else if (user.role !== allowedRole) {
      return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Accesso Negato. Non hai i permessi per questa sezione.</div>;
    }
  }

  return <>{children}</>;
};

const NavLinks = () => {
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <div className="nav-links">
      <Link className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} to="/">
        <BarChart2 size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Dashboard
      </Link>
      <Link className={`nav-link ${location.pathname === '/office' ? 'active' : ''}`} to="/office">
        <TrendingUp size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Ufficio
      </Link>
      <Link className={`nav-link ${location.pathname === '/production' ? 'active' : ''}`} to="/production">
        <Package size={18} style={{ marginRight: 6, verticalAlign: 'middle' }} /> Produzione
      </Link>
      {user && (
        <button className="btn-danger" onClick={logout} style={{ marginLeft: '1rem', padding: '0.4rem 0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <LogOut size={16} /> Esci
        </button>
      )}
    </div>
  );
};

function AppContent() {
  const { user } = useAuth();

  return (
    <div className="app-container">
      {user && (
        <header className="nav-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo.png" alt="Logo" style={{ height: '70px', objectFit: 'contain' }} />
            <h1 style={{ margin: 0, fontSize: '2.5rem', letterSpacing: '2px' }}>OPTY</h1>
          </div>
          <NavLinks />
        </header>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/login" element={<LoginView />} />
          <Route path="/" element={
            <ProtectedRoute allowedRole="Office">
              <DashboardView />
            </ProtectedRoute>
          } />
          <Route path="/office" element={
            <ProtectedRoute allowedRole="Office">
              <OfficeView />
            </ProtectedRoute>
          } />
          <Route path="/production" element={
            <ProtectedRoute allowedRole="Production">
              <ProductionView />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
