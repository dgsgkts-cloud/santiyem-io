import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { useUser } from "@/contexts/UserContext";
import LandingPage from "./LandingPage";
import Index from "./Index";

const HomePage = () => {
  const { user, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
      </div>
    );
  }

  // Native mobile apps should never show the marketing landing page (with its
  // web footer). Send unauthenticated native users straight to login.
  if (!user && Capacitor.isNativePlatform()) {
    return <Navigate to="/login" replace />;
  }

  return user ? <Index /> : <LandingPage />;
};

export default HomePage;
