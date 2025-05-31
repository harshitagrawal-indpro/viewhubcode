
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ProtectedRoute = () => {
  const location = useLocation();
  const { user, loading } = useAuth();

  // Show loading indicator while auth state is being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  // Redirect to user-type selection if not authenticated
  if (!user) {
    return <Navigate to="/user-type" state={{ from: location.pathname }} replace />;
  }

  // User is authenticated, render the protected content (Outlet will be wrapped by Layout in App.tsx)
  return <Outlet />;
};

export default ProtectedRoute;
