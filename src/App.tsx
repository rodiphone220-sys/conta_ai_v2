/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { SplashScreen } from "./components/SplashScreen";
import { LoginScreen } from "./components/LoginScreen";
import { SignUpScreen } from "./components/SignUpScreen";
import { VerificationScreen } from "./components/VerificationScreen";
import { Dashboard } from "./components/Dashboard";
import { InvoiceForm } from "./components/InvoiceForm";
import { AIAssistant } from "./components/AIAssistant";
import { SetupWizard } from "./components/SetupWizard";
import { AlertSystem } from "./components/AlertSystem";
import { motion, AnimatePresence } from "motion/react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

type AppState = "splash" | "login" | "signup" | "verification" | "dashboard" | "new-invoice";

interface DashboardState {
  currentView: string;
  stats: { total: string; emitidas: number; clientes: number };
  openAIAssistant?: boolean;
}

interface DashboardState {
  currentView: string;
  stats: { total: string; emitidas: number; clientes: number };
}

export default function App() {
  const [state, setState] = useState<AppState>("splash");
  const [showSetup, setShowSetup] = useState(false);
  const [csdConfigured, setCsdConfigured] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState>({
    currentView: "dashboard",
    stats: { total: "124500.00", emitidas: 48, clientes: 12 }
  });

  // Listen for client selection event from ClientsPage
  useEffect(() => {
    const handleClientInvoice = (e: Event) => {
      const client = (e as CustomEvent).detail;
      setSelectedClient(client);
      setState("new-invoice");
    };
    window.addEventListener("new-invoice-with-client", handleClientInvoice);
    return () => window.removeEventListener("new-invoice-with-client", handleClientInvoice);
  }, []);

  useEffect(() => {
    if (state === "splash") {
      const timer = setTimeout(() => {
        setState("login");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  useEffect(() => {
    if (state === "dashboard" || state === "new-invoice") {
      checkCsdStatus();
    }
  }, [state]);

  useEffect(() => {
    if (dashboardState.openAIAssistant) {
      setTimeout(() => {
        const aiElement = document.querySelector('[data-ai-assistant]');
        if (aiElement) {
          aiElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
      setDashboardState(prev => ({ ...prev, openAIAssistant: false }));
    }
  }, [dashboardState.openAIAssistant]);

  const checkCsdStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/setup/status`);
      const data = await response.json();
      setCsdConfigured(data.csdConfigured);
      if (!data.csdConfigured && showSetup) {
      }
    } catch (error) {
      console.error("Error checking CSD status:", error);
      setCsdConfigured(false);
    }
  };

  const handleLogin = (user: { id: string; name: string; email: string }, needsVerification?: boolean) => {
    if (needsVerification) {
      setUserEmail(user.email);
      setUserName(user.name);
      setState("verification");
      toast.info("Por favor verifica tu email", {
        description: "Hemos enviado un código de verificación a tu correo.",
      });
    } else {
      toast.success("¡Bienvenido de nuevo!", {
        description: "Has iniciado sesión correctamente.",
        className: "bg-brand-dark text-white border-brand-primary",
      });
      setState("dashboard");
    }
  };

  const handleSignUp = (email: string, name: string, isGoogleSignup: boolean = false) => {
    console.log('[App.tsx] handleSignUp called:', { email, name, isGoogleSignup });
    setUserEmail(email);
    setUserName(name);
    toast.success(`¡Bienvenido, ${name}!`, {
      description: isGoogleSignup
        ? "Tu cuenta ha sido creada con Google. Configura tu CSD para comenzar a facturar."
        : "Tu cuenta ha sido creada exitosamente.",
      className: "bg-brand-primary text-white border-brand-dark",
    });
    console.log('[App.tsx] Setting state to dashboard');
    setState("dashboard");
  };

  const handleLogout = () => {
    setState("login");
    toast.info("Sesión cerrada", {
      description: "Has salido del sistema.",
    });
  };

  const handleVerificationComplete = () => {
    toast.success("¡Email verificado!", {
      description: "Tu cuenta está lista para usar.",
    });
    setState("dashboard");
  };

  const handleNewInvoice = () => {
    setState("new-invoice");
  };

  const handleSaveInvoice = (data: any) => {
    console.log("Invoice Saved:", data);
    toast.success("Factura Timbrada", {
      description: `Se ha generado el folio F-1025 por un total de $${data.total.toLocaleString()}`,
      className: "bg-emerald-500 text-white border-emerald-600",
    });
    setState("dashboard");
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    setCsdConfigured(true);
    toast.success("Configuración completada", {
      description: "Tu CSD está listo para facturación",
    });
  };

  // Manejar navegación desde la IA o alertas
  const handleAINavigate = (view: string) => {
    if (view === "ai") {
      setDashboardState(prev => ({ ...prev, openAIAssistant: true }));
      setState("dashboard");
    } else if (view === "dashboard") {
      setState("dashboard");
    } else if (view === "pending" || view === "clients" || view === "settings") {
      setState("dashboard");
      window.dispatchEvent(new CustomEvent("ai-navigate", { detail: { view } }));
    } else if (view === "new-invoice") {
      setState("new-invoice");
    }
  };

  return (
    <div className="min-h-screen font-sans text-brand-dark selection:bg-brand-primary/20 selection:text-brand-primary">
      <Toaster position="top-right" richColors closeButton />

      <AnimatePresence mode="wait">
        {state === "splash" && (
          <motion.div
            key="splash"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <SplashScreen />
          </motion.div>
        )}

        {state === "login" && (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <LoginScreen onLogin={handleLogin} onSignUp={() => setState("signup")} />
          </motion.div>
        )}

        {state === "signup" && (
          <motion.div
            key="signup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <SignUpScreen onBack={() => setState("login")} onSignUp={handleSignUp} />
          </motion.div>
        )}

        {state === "verification" && (
          <motion.div
            key="verification"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <VerificationScreen
              email={userEmail}
              name={userName}
              onVerificationComplete={handleVerificationComplete}
              onBack={() => setState("login")}
            />
          </motion.div>
        )}

        {state === "dashboard" && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Dashboard
              onNewInvoice={handleNewInvoice}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {state === "new-invoice" && (
          <motion.div
            key="new-invoice"
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ duration: 0.5, type: "spring", damping: 25, stiffness: 200 }}
          >
            <InvoiceForm
              onBack={() => { setState("dashboard"); setSelectedClient(null); }}
              onSave={handleSaveInvoice}
              editInvoice={selectedClient ? { clientData: selectedClient } : undefined}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {showSetup && csdConfigured === false && (state === "dashboard" || state === "new-invoice") && (
        <SetupWizard onComplete={handleSetupComplete} />
      )}

      {(state === "dashboard" || state === "new-invoice") && (
        <div data-ai-assistant>
          <AIAssistant
            currentView={dashboardState.currentView}
            stats={dashboardState.stats}
            userRegimen="612"
            onNavigate={handleAINavigate}
          />
        </div>
      )}

      {state === "dashboard" && (
        <div className="fixed top-4 right-4 z-30">
          <AlertSystem onNavigate={handleAINavigate} />
        </div>
      )}
    </div>
  );
}
