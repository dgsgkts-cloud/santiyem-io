import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import NotFound from "./pages/NotFound.tsx";
import KullanimSartlari from "./pages/KullanimSartlari.tsx";
import GizlilikPolitikasi from "./pages/GizlilikPolitikasi.tsx";
import IptalIadePolitikasi from "./pages/IptalIadePolitikasi.tsx";
import Hakkimizda from "./pages/Hakkimizda.tsx";
import TeslimatIade from "./pages/TeslimatIade.tsx";
import MesafeliSatisSozlesmesi from "./pages/MesafeliSatisSozlesmesi.tsx";
import Iletisim from "./pages/Iletisim.tsx";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";
import Unsubscribe from "./pages/Unsubscribe.tsx";
import ContractSignUpload from "./pages/ContractSignUpload.tsx";
import PaymentResult from "./pages/PaymentResult.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/kullanim-sartlari" element={<KullanimSartlari />} />
            <Route path="/gizlilik-politikasi" element={<GizlilikPolitikasi />} />
            <Route path="/iptal-iade-politikasi" element={<IptalIadePolitikasi />} />
            <Route path="/hakkimizda" element={<Hakkimizda />} />
            <Route path="/teslimat-iade" element={<TeslimatIade />} />
            <Route path="/mesafeli-satis-sozlesmesi" element={<MesafeliSatisSozlesmesi />} />
            <Route path="/iletisim" element={<Iletisim />} />
            <Route path="/sozlesme-imza/:token" element={<ContractSignUpload />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />
            <Route path="/odeme-sonucu" element={<PaymentResult />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <CookieBanner />
          <WhatsAppButton />
        </BrowserRouter>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
