import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";
import type { Role } from "./api";
import { hasRole } from "./roles";

interface Props {
  roles?: Role[];
}

export default function RouteGuard({ roles }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (roles && !hasRole(user.role, roles)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
