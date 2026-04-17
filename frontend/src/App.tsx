import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import KycReviewPage from './pages/KycReviewPage';
import Dashboard from './pages/Dashboard';
import FundingPage from './pages/FundingPage';
import InvestmentOptions from './pages/InvestmentOptions';
import SmartAssistant from './pages/SmartAssistant';
import ProfilePage from './pages/ProfilePage';
import LearningModules from './pages/LearningModules';
import RewardsDashboard from './pages/RewardsDashboard';
import AdminPanel from './pages/AdminPanel';
import ReportsPage from './pages/ReportsPage';

function HomeGate() {
  const { token, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">Loading…</div>;
  if (token) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeGate />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/onboarding/review"
        element={
          <ProtectedRoute>
            <KycReviewPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/funding"
        element={
          <ProtectedRoute>
            <FundingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/invest"
        element={
          <ProtectedRoute>
            <InvestmentOptions />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assistant"
        element={
          <ProtectedRoute>
            <SmartAssistant />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learn/:moduleId"
        element={
          <ProtectedRoute>
            <LearningModules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/learn"
        element={
          <ProtectedRoute>
            <LearningModules />
          </ProtectedRoute>
        }
      />
      <Route
        path="/rewards"
        element={
          <ProtectedRoute>
            <RewardsDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute admin>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
