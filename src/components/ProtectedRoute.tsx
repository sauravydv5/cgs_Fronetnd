import React, { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { toast } from "sonner";

interface ProtectedRouteProps {
  requiredPermission?: string; // Optional: Agar specific permission chahiye
}

const AccessDenied = () => {
  useEffect(() => {
    toast.error("Access Denied", {
      description: "Admin access only",
    });
  }, []);
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
      <p className="text-gray-500 mt-2">You do not have permission to view this page.</p>
    </div>
  );
};

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredPermission }) => {
  const userStr = localStorage.getItem("user");
  const token = localStorage.getItem("token");

  // 1. Check if User is Logged In
  if (!userStr || !token) {
    return <Navigate to="/login" replace />;
  }

  const user = JSON.parse(userStr);

  // 2. Admin Bypass (Optional: Admin ke paas sab access hota hai)
  // Handle case where role might be an object or just a string ID (though usually populated on login)
  const roleName = user.role?.roleName || (typeof user.role === 'string' ? user.role : '');
  if (roleName === "Admin" || user.isAdmin === true) {
    return <Outlet />;
  }

  // 3. Check Specific Permission
  if (requiredPermission) {
    const userPermissions = Array.isArray(user.permissions) ? user.permissions : [];
    if (!userPermissions.includes(requiredPermission)) {
      return <AccessDenied />; // Unauthorized access
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;