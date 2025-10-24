import { Navigate } from "react-router-dom";
import React from "react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export const AdminRoute = ({ children }: AdminRouteProps) => {
  const token = localStorage.getItem("adminToken");
  if (!token) return <Navigate to="/login" replace />;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    if (payload.role !== "admin") return <Navigate to="/" replace />;
  } catch {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
