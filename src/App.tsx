import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UserProvider } from "@/contexts/UserContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { Capacitor } from "@capacitor/core";
import HomePage from "./pages/HomePage";
import CookieBanner from "@/components/CookieBanner";
import WhatsAppButton from "@/components/WhatsAppButton";

import DeepLinkHandler from "@/components/DeepLinkHandler";
import NativeSetup from "@/components/NativeSetup";

const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const KullanimSartlari = lazy(() => import("./pages/KullanimSartlari"));
const GizlilikPolitikasi = lazy(() => import("./pages/GizlilikPolitikasi"));
const IptalIadePolitikasi = lazy(() => import("./pages/IptalIadePolitikasi"));
const Hakkimizda = lazy(() => import("./pages/Hakkimizda"));
const TeslimatIade = lazy(() => import("./pages/TeslimatIade"));
const MesafeliSatisSozlesmesi = lazy(() => import("./pages/MesafeliSatisSozlesmesi"));
const Iletisim = lazy(() => import("./pages/Iletisim"));
const ContractSignUpload = lazy(() => import("./pages/ContractSignUpload"));
const HakedisApproval = lazy(() => import("./pages/HakedisApproval"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const PaymentResult = lazy(() => import("./pages/PaymentResult"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const SantiyeGiris = lazy(() => import("./pages/SantiyeGiris"));
const EkipTakip = lazy(() => import("./pages/EkipTakip"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center" style={{ background: "#0F1419" }}>
    <div className="w-8 h-8 border-2 border-t-[#FF6B2B] border-[#1E2732] rounded-full animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <UserProvider>
        <ThemeProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/settings" element={<HomePage />} />
              <Route path="/dashboard" element={<HomePage />} />
              <Route path="/projeler" element={<HomePage />} />
              <Route path="/hakedis" element={<HomePage />} />
              <Route path="/gunluk" element={<HomePage />} />
              <Route path="/ai-asistan" element={<HomePage />} />
              <Route path="/odemeler-kasa" element={<HomePage />} />
              <Route path="/sozlesmeler" element={<HomePage />} />
              <Route path="/malzemeler" element={<HomePage />} />
              <Route path="/e-fatura" element={<HomePage />} />
              <Route path="/hatirlatici" element={<HomePage />} />
              <Route path="/planlar" element={<HomePage />} />
              <Route path="/gunluk-bilgi" element={<HomePage />} />
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
              <Route path="/hakedis-onay/:token" element={<HakedisApproval />} />
              <Route path="/unsubscribe" element={<Unsubscribe />} />
              <Route path="/odeme-sonucu" element={<PaymentResult />} />
              <Route path="/payment-callback" element={<PaymentCallback />} />
              <Route path="/santiye-giris/:token" element={<SantiyeGiris />} />
              <Route path="/ekip/:token" element={<EkipTakip />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          {!Capacitor.isNativePlatform() && <CookieBanner />}
          <WhatsAppButton />
          
          <DeepLinkHandler />
          <NativeSetup />
        </BrowserRouter>
        </ThemeProvider>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
