import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./AuthProvider";

const AppProviders = ({ children }) => {
  return (
    <GoogleOAuthProvider
      clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}
    >
      <AuthProvider>
        {children}
      </AuthProvider>
    </GoogleOAuthProvider>
  );
};

export default AppProviders;