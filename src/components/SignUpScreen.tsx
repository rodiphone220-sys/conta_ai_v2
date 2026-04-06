import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { LogIn, Mail, Lock, User, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";

declare global {
  interface Window {
    google: any;
  }
}

interface SignUpScreenProps {
  onBack: () => void;
  onSignUp: (email: string, name: string, isGoogleSignup?: boolean) => void;
}

import API_URL from "../config/api";
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim().replace(/"/g, "").trim();
const isValidGoogleClientId = GOOGLE_CLIENT_ID &&
  !GOOGLE_CLIENT_ID.startsWith("YOUR_GOOGLE_CLIENT_ID") &&
  GOOGLE_CLIENT_ID.endsWith(".apps.googleusercontent.com");
const showGoogleSignIn = isValidGoogleClientId;

export function SignUpScreen({ onBack, onSignUp }: SignUpScreenProps) {
  const [step, setStep] = useState<"form" | "verification" | "success">("form");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [googleReady, setGoogleReady] = useState(false);
  const [googlePromptFailed, setGooglePromptFailed] = useState(false);

  useEffect(() => {
    // Check if we're returning from Google OAuth redirect
    const handleOAuthRedirect = () => {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const error = hashParams.get('error');

      // Check for OAuth errors
      if (error) {
        console.warn("OAuth redirect error:", error, hashParams.get('error_description'));
        toast.error("No se pudo completar el registro con Google");
        setIsGoogleLoading(false);
        window.history.replaceState({}, document.title, window.location.pathname);
        return;
      }

      if (accessToken && sessionStorage.getItem('google_oauth_redirect_signup') === 'true') {
        // Clear the redirect flag
        sessionStorage.removeItem('google_oauth_redirect_signup');

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
          // Directly process the signup instead of using handleGoogleResponse
          performGoogleSignUp(userInfo.email, userInfo.name);
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

    const performGoogleSignUp = async (googleEmail: string, googleName: string) => {
      setIsGoogleLoading(true);
      try {
        const apiResponse = await fetch(`${API_URL}/api/auth/google-signup`, {
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

        if (data.success || data.isNewUser || data.user) {
          // Mostrar password autogenerado si es usuario nuevo
          if (data.isNewUser && data.autoPassword) {
            toast.success(`¡Bienvenido, ${googleName}! Tu password: ${data.autoPassword}`, {
              description: "Guarda este password para iniciar sesión con email.",
              duration: 10000,
            });
          } else {
            toast.success(`¡Bienvenido de vuelta, ${googleName}!`, {
              description: "Has iniciado sesión con Google.",
            });
          }

          try {
            await fetch(`${API_URL}/api/email/welcome`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: googleEmail, name: googleName })
            });
          } catch (e) {
            console.log('Email de bienvenida no enviado (no crítico)');
          }
          onSignUp(googleEmail, googleName, true);
        } else {
          throw new Error(data.error || "Error en la respuesta del servidor");
        }
      } catch (err) {
        console.error("Google signup error:", err);
        const message = err instanceof Error ? err.message : "Error desconocido";
        toast.error(`Error al registrarse con Google: ${message}`);
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
      const existingScript = document.getElementById("google-signin-script");
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.id = "google-signin-script";
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
      const script = document.getElementById("google-signin-script");
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

      const apiResponse = await fetch(`${API_URL}/api/auth/google-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          name: googleName,
          googleToken: response.credential,
        }),
      });

      if (!apiResponse.ok) {
        throw new Error(`Server error: ${apiResponse.status}`);
      }

      const data = await apiResponse.json();

      if (data.success || data.isNewUser || data.user) {
        // Mostrar password autogenerado si es usuario nuevo
        if (data.isNewUser && data.autoPassword) {
          toast.success(`¡Bienvenido, ${googleName}! Tu password: ${data.autoPassword}`, {
            description: "Guarda este password para iniciar sesión con email.",
            duration: 10000,
          });
        } else {
          toast.success(`¡Bienvenido de vuelta, ${googleName}!`, {
            description: "Has iniciado sesión con Google.",
          });
        }

        try {
          await fetch(`${API_URL}/api/email/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: googleEmail, name: googleName })
          });
        } catch (e) {
          console.log('Email de bienvenida no enviado (no crítico)');
        }
        onSignUp(googleEmail, googleName, true);
      } else {
        throw new Error(data.error || "Error en la respuesta del servidor");
      }
    } catch (err) {
      console.error("Google response processing error:", err);
      const message = err instanceof Error ? err.message : "Error desconocido";
      toast.error(`Error al procesar la respuesta de Google: ${message}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
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

      // Store state to handle redirect response (different key for signup)
      sessionStorage.setItem('google_oauth_redirect_signup', 'true');
      window.location.href = authUrl;
    } catch (error) {
      console.error("OAuth redirect failed:", error);
      toast.error("Error al redirigir a Google. Intenta con email.");
      setIsGoogleLoading(false);
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("El nombre es requerido");
      return;
    }

    if (!validateEmail(email)) {
      setError("Ingresa un email válido");
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setVerificationCode(data.verificationCode || "123456");
        setStep("verification");
      } else {
        setError(data.error || "Error al registrar");
      }
    } catch {
      setVerificationCode("123456");
      setStep("verification");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enteredCode.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setIsLoading(true);
    console.log('[SignUpScreen] Iniciando verificación con código:', enteredCode);

    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: enteredCode }),
      });

      console.log('[SignUpScreen] Respuesta del servidor:', response.status, response.ok);

      if (response.ok) {
        console.log('[SignUpScreen] ✅ Verificación exitosa (API), redirigiendo al dashboard...');

        // Enviar email de bienvenida
        try {
          await fetch(`${API_URL}/api/email/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
          console.log('[SignUpScreen] Email de bienvenida enviado');
        } catch (e) {
          console.log('[SignUpScreen] Email de bienvenida no enviado (no crítico):', e);
        }

        // Redirigir al dashboard directamente
        console.log('[SignUpScreen] Llamando onSignUp con:', { email, name });
        onSignUp(email, name);
      } else {
        const data = await response.json();
        console.log('[SignUpScreen] ❌ Error de verificación:', data.error);
        setError(data.error || "Código incorrecto");
      }
    } catch (err) {
      console.log('[SignUpScreen] ⚠️ Error de red, intentando fallback...', err);

      // Fallback: verificar contra el código almacenado localmente
      if (enteredCode === verificationCode) {
        console.log('[SignUpScreen] ✅ Verificación exitosa (FALLBACK), redirigiendo al dashboard...');

        try {
          await fetch(`${API_URL}/api/email/welcome`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name })
          });
        } catch (e) {
          console.log('[SignUpScreen] Email de bienvenida no enviado (no crítico)');
        }

        console.log('[SignUpScreen] Llamando onSignUp con:', { email, name });
        onSignUp(email, name);
      } else {
        console.log('[SignUpScreen] ❌ Código incorrecto (FALLBACK)');
        setError("Código incorrecto");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = async () => {
    try {
      await fetch(`${API_URL}/api/email/welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name })
      });
    } catch (e) {
      console.log('Email de bienvenida no enviado (no crítico)');
    }
    onSignUp(email, name);
  };

  return (
    <div className="min-h-screen bg-brand-light flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px]" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-gold/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-[80px]" />

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-md relative"
      >
        <div className="glass p-6 sm:p-10 rounded-[32px] sm:rounded-[40px] shadow-3d relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-primary to-brand-gold" />

          <button
            onClick={onBack}
            className="absolute top-4 left-4 p-2 hover:bg-brand-dark/5 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-brand-dark/40" />
          </button>

          <div className="flex flex-col items-center mb-8 sm:mb-10 mt-6">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-dark mb-2">
              {step === "form" && "Crear Cuenta"}
              {step === "verification" && "Verificar Email"}
              {step === "success" && "¡Cuenta Creada!"}
            </h2>
            <p className="text-brand-dark/60 text-center text-sm sm:text-base">
              {step === "form" && "Regístrate para comenzar a facturar"}
              {step === "verification" && `Enviamos un código a ${email}`}
              {step === "success" && "Tu cuenta ha sido verificada"}
            </p>
          </div>

          {step === "form" && (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {showGoogleSignIn && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
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

              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-dark/80 ml-1">Nombre completo</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/40 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="Tu nombre completo"
                  />
                </div>
              </div>

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
                <label className="text-sm font-semibold text-brand-dark/80 ml-1">Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/40 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="Mínimo 8 caracteres"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-dark/80 ml-1">Confirmar Contraseña</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-dark/40 group-focus-within:text-brand-primary transition-colors" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-3 sm:py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                    placeholder="Repite la contraseña"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "w-full bg-brand-dark text-white rounded-2xl py-3 sm:py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all hover:bg-brand-primary shadow-xl active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed",
                  isLoading && "animate-pulse"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    Crear Cuenta
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>
          )}

          {step === "verification" && (
            <form onSubmit={handleVerify} className="space-y-6">
              <div className="text-center p-6 bg-brand-light rounded-2xl">
                <Mail className="w-12 h-12 text-brand-primary mx-auto mb-3" />
                <p className="text-sm text-brand-dark/60">
                  Ingresa el código de 6 dígitos que enviamos a tu correo electrónico.
                </p>
                <p className="text-xs text-brand-dark/40 mt-2 font-mono">
                  Código de prueba: <strong>{verificationCode}</strong>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-brand-dark/80 ml-1">Código de verificación</label>
                <input
                  type="text"
                  required
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full bg-white/50 border border-brand-dark/10 rounded-2xl py-4 px-4 text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || enteredCode.length !== 6}
                className={cn(
                  "w-full bg-brand-primary text-white rounded-2xl py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all hover:bg-brand-primary/90 shadow-xl active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    Verificar
                    <CheckCircle2 className="w-5 h-5" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full text-brand-dark/60 hover:text-brand-dark text-sm font-semibold"
              >
                ¿No recibiste el código? Reenviar
              </button>
            </form>
          )}

          {step === "success" && (
            <div className="text-center space-y-6">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-500" />
              </motion.div>

              <div>
                <h3 className="text-xl font-display font-bold text-brand-dark mb-2">
                  ¡Bienvenido, {name}!
                </h3>
                <p className="text-brand-dark/60">
                  Tu cuenta ha sido verificada exitosamente. Ahora puedes comenzar a usar My Conta AI.
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full bg-brand-primary text-white rounded-2xl py-4 font-bold text-lg flex items-center justify-center gap-2 transition-all hover:bg-brand-primary/90 shadow-xl active:scale-95"
              >
                Comenzar
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        <div className="absolute -z-10 -top-4 -right-4 w-24 h-24 bg-brand-gold/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute -z-10 -bottom-4 -left-4 w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl animate-pulse" />
      </motion.div>
    </div>
  );
}
