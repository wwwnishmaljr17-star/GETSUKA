import { Navigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";

const ProtectedRoute = ({ children }) => {
  const { loading } = useAuth();

  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (loading) {
    return (
      <div className="w-screen h-screen bg-[#1c1c1c] flex items-center justify-center">
        <p className="text-white text-xs tracking-widest">
          LOADING...
        </p>
      </div>
    );
  }

  // No session → login
  if (!token || !savedUser) {
    return <Navigate to="/login" replace />;
  }

  // Valid session → show protected page
  return children;
};

export default ProtectedRoute;