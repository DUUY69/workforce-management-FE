import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AssistantPanelProvider } from "@/widgets/assistant-panel-state";
import Dashboard from "@/layouts/dashboard";
import Auth from "@/layouts/auth";
import CareersLayout from "@/layouts/CareersLayout";
import CareersHome from "@/pages/careers/CareersHome";
import JobDetail from "@/pages/careers/JobDetail";
import BlogDetail from "@/pages/careers/BlogDetail";

function AppRoutes() {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-blue-gray-500">Đang tải...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth/*" element={<Auth />} />
      <Route path="/careers" element={<CareersLayout />}>
        <Route index element={<CareersHome />} />
        <Route path="jobs/:slug" element={<JobDetail />} />
        <Route path="blog/:slug" element={<BlogDetail />} />
      </Route>
      <Route
        path="/dashboard/*"
        element={currentUser ? <Dashboard /> : <Navigate to="/auth/login" replace />}
      />
      <Route path="*" element={<Navigate to={currentUser ? "/dashboard/home" : "/careers"} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AssistantPanelProvider>
        <AppRoutes />
      </AssistantPanelProvider>
    </AuthProvider>
  );
}
