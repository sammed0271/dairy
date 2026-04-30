import { Navigate, Outlet } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

export default function RoleRoute({ role }: { role: string }) {
  const { user } = useAppContext();
  const storedUser = JSON.parse(localStorage.getItem("user") || "null");
  const storedToken = localStorage.getItem("token");

  if (!storedUser || !storedToken) {
    return <Navigate to="/login" />;
  }

  if (storedUser.role !== role) {
    return storedUser.role === "superadmin"
      ? <Navigate to="/sa/dashboard" />
      : <Navigate to="/dashboard" />;
  }

  return <Outlet />;
}