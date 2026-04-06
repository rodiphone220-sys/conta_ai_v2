import { motion } from "motion/react";
import React, { useState, useEffect } from "react";
import { LogIn, User, Lock, Mail, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

declare global {
  interface Window {
    google: any;
  }
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim().replace(/"/g, "").trim();
const isValidGoogleClientId = GOOGLE_CLIENT_ID &&
  !GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID") &&
  GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");
const showGoogleSignIn = isValidGoogleClientId;

interface LoginScreenProps {
  onLogin: (user: { id: string; name: string; email: string }, needsVerification?: boolean) => void;
  onSignUp: () => void;
}

const DEMO_USER = {
  email: "demo@myconta.ai",
  password: "demo123",
  name: "Usuario Demo",
  id: "USR-DEMO-001"
};

export function LoginScreen({ onLogin, onSignUp }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googlePromptFailed, setGooglePromptFailed] = useState(false);

  // Google Sign-In Script
  useEffect(() => {
    if (!showGoogleSignIn) return;

    // Check if we're returning from Google OAuth redirect
    const handleOAuthRedirect = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');

      // Check for OAuth errors
      if (error) {
        console.warn("OAuth redirect error:", error, hashParams.get('error_description'));
        toast.error("No se pudo completar el inicio de sesión con Google");
        setIsGoogleLoading(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (accessToken && sessionStorage.getItem('google_oauth_redirect') === 'true') {
        // Clear the redirect flag
        sessionStorage.removeItem('google_oauth_redirect');

        // Fetch user info from Google
        fetchUserInfo(accessToken);

        // Clean up the URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };

    const fetchUserInfo = async (token: string) => {
      try {
        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userInfo = await response.json();
          // Directly process the login instead of using handleGoogleResponse
          performGoogleLogin(userInfo.email, userInfo.name);
        } else {
          toast.error("Error al obtener información de Google");
          setIsGoogleLoading(false);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        toast.error("Error al conectar con Google");
        setIsGoogleLoading(false);
      }
    };

    const performGoogleLogin = async (googleEmail: string, googleName: string) => {
      try {
        const apiResponse = await fetch(`${API_URL}/api/auth/google-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: googleEmail,
            name: googleName,
          }),
        });

        if (!apiResponse.ok) {
          throw new Error(`Server error: ${apiResponse.status}`);
        }

        const data = await apiResponse.json();

        if (data.success) {
          toast.success(`¡Bienvenido de vuelta, ${data.user.name}!`, {
            description: "Has iniciado sesión con Google.",
          });
          onLogin(data.user);
        } else {
          throw new Error(data.error || "Error en la respuesta del servidor");
        }
      } catch (err) {
        console.error("Google login error:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast.error(`Error al iniciar sesión con Google: ${message}`);
        setIsGoogleLoading(false);
      }
    };

    handleOAuthRedirect();

    const initGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
          auto_select: false,
          use_fedcm_for_prompt: true, // Enable FedCM for better privacy and UX
          intermediate_iframe: false, // Disable intermediate iframe for cleaner UX
        });
        setGoogleReady(true);
      }
    };

    const loadGoogleScript = () => {
      const existingScript = document.getElementById("google-signin-script-login");
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.id = "google-signin-script-login";
        script.async = true;
        script.defer = true;
        script.onload = initGoogleSignIn;
        document.head.appendChild(script);
      } else {
        initGoogleSignIn();
      }
    };

    loadGoogleScript();

    // Cleanup on unmount
    return () => {
      const script = document.getElementById("google-signin-script-login");
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsGoogleLoading(true);
    try {
      if (!response?.credential) {
        throw new Error("No se recibió credencial de Google");
      }

      const payload = JSON.parse(atob(response.credential.split(".")[1]));
      const googleEmail = payload.email;
      const googleName = payload.name;

      const apiResponse = await fetch(`${API_URL}/api/auth/google-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          name: googleName,
          googleToken: response.credential,
        }),
      });

      const data = await apiResponse.json();

      if (apiResponse.ok && data.success) {
        toast.success(`¡Bienvenido de vuelta, ${data.user.name}!`, {
          description: "Has iniciado sesión con Google.",
        });
        onLogin(data.user);
      } else {
        throw new Error(data.error || "Error en la respuesta del servidor");
      }
    } catch (err) {
      console.error("Google response processing error:", err);
      const message = err instanceof Error ? err.message : "Error desconocido";

      // If One Tap failed, automatically fallback to redirect
      if (message.includes("credencial") || message.includes("Server error")) {
        console.log("One Tap failed, will use redirect fallback");
      }

      toast.error(`Error al iniciar sesión con Google: ${message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    if (!window.google || !googleReady) {
      toast.error("Google Sign-In no está listo. Intenta de nuevo en un momento.");
      return;
    }

    setIsGoogleLoading(true);
    setGooglePromptFailed(false);

    try {
      // Try One Tap prompt first
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          const reason = notification.getNotDisplayedReason() || notification.getSkippedReason() || "unknown";
          console.warn("Google One Tap not displayed:", reason);

          // On mobile, One Tap often fails, so immediately fallback to redirect
          setGooglePromptFailed(true);
          setIsGoogleLoading(false);

          // Auto-redirect after a short delay for better UX
          setTimeout(() => {
            triggerGoogleOAuthRedirect();
          }, 500);

          toast.error("El popup de Google no se mostró. Usando método alternativo...", {
            duration: 3000,
          });

          // Trigger OAuth redirect as fallback
          triggerGoogleOAuthRedirect();
        }
      });
    } catch (error) {
      console.error("Error triggering Google prompt:", error);
      setIsGoogleLoading(false);
      toast.error("Error al iniciar Google Sign-In. Usando método alternativo...");
      triggerGoogleOAuthRedirect();
    }
  };

  // Fallback: Trigger Google OAuth via redirect
  const triggerGoogleOAuthRedirect = () => {
    try {
      // Use Google's OAuth2 authorization endpoint with redirect
      const redirectUri = encodeURIComponent(window.location.origin);
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=token&scope=email%20profile&prompt=select_account`;

      // Store state to handle redirect response
      sessionStorage.setItem('google_oauth_redirect', 'true');
      window.location.href = authUrl;
    } catch (error) {
      console.error("OAuth redirect failed:", error);
      toast.error("Error al redirigir a Google. Intenta con email.");
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (data.success) {
        // Check if user needs verification (new user created from login)
        if (data.needsVerification) {
          onLogin(data.user, true);
        } else {
          onLogin(data.user);
        }
      } else {
        setError(data.error || "Credenciales incorrectas");
      }
    } catch (err) {
      setError("Error de conexión. Verifica el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail(DEMO_USER.email);
    setPassword(DEMO_USER.password);
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: DEMO_USER.email, password: DEMO_USER.password })
      });

      const data = await response.json();

      if (data.success) {
        onLogin(data.user);
      } else {
        setError("Usuario demo no disponible. Verifica el servidor.");
      }
    } catch (err) {
      setError("Error de conexión con el servidor demo.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Shapes */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative"
      >
        <div className="glass p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-3d relative overflow-hidden">
          {/* Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-primary to-brand-gold" />

          <div className="flex flex-col items-center mb-8 sm:mb-10">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl overflow-hidden p-2">
              <img
                src="/logo-conta-ai.svg"
                alt="My Conta-AI Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = "https://picsum.photos/seed/robot/200/200";
                }}
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-dark mb-2">My Conta-AI</h2>
            <p className="text-brand-dark/60 text-center text-sm sm:text-base">Inicia sesión para gestionar tus facturas CFDI 4.0</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {showGoogleSignIn && (
            <>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading || !googleReady}
                className="w-full bg-white border-2 border-gray-200 text-brand-dark rounded-2xl py-3 sm:py-4 font-semibold flex items-center justify-center gap-3 transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
              >
                {isGoogleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-brand-dark" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                Continuar con Google
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-dark/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-brand-dark/40">o con email</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-brand-dark/80 ml-1">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/40 group-focus-within:text-brand-primary transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-sm font-semibold text-brand-dark/80">Contraseña</label>
                <button type="button" className="text-xs text-brand-primary hover:underline font-semibold">¿Olvidaste?</button>
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/40 group-focus-within:text-brand-primary transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                "w-full bg-brand-dark text-white rounded-2xl py-3 sm:py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all hover:bg-brand-primary hover:shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
                isLoading && "animate-pulse"
              )}
            >
              {isLoading ? "Iniciando..." : "Entrar"}
              {!isLoading && <ChevronRight className="w-5 h-5" />}
            </button>
          </form>

          {/* Demo Login Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={isLoading}
            className="w-full mt-4 bg-gradient-to-r from-brand-gold/20 to-brand-primary/20 text-brand-dark border border-brand-dark/20 rounded-2xl py-3 font-semibold flex items-center justify-center gap-2 hover:from-brand-gold/30 hover:to-brand-primary/30 transition-all disabled:opacity-50"
          >
            <User className="w-4 h-4" />
            Entrar con Demo
          </button>

          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-brand-dark/5 text-center">
            <p className="text-sm text-brand-dark/60">
              ¿No tienes cuenta? <button onClick={onSignUp} className="text-brand-primary font-bold hover:underline">Regístrate</button>
            </p>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute -z-10 -top-4 -right-4 w-24 h-24 bg-brand-gold/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute -z-10 -bottom-4 -left-4 w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl animate-pulse" />
      </motion.div>
    </div>
  );
}
