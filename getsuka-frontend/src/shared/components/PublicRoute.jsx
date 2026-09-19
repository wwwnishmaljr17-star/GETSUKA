import { Navigate } from "react-router-dom";
import { useAuth } from "../../app/providers/AuthProvider";

const PublicRoute = ({ children }) => {
  const { loading } = useAuth();

  const token = localStorage.getItem("token");
  const savedUser = localStorage.getItem("user");

  if (loading) {
    return (
      <div className="w-screen h-screen bg-white flex items-center justify-center">
        <p className="text-black text-xs tracking-widest">
          LOADING...
        </p>
      </div>
    );
  }

  // Already logged in → never show login/register/OTP
  if (token && savedUser) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default PublicRoute;