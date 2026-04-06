import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../lib/utils";
import { toast } from "sonner";
import API_URL from "../config/api";

const API_URL_TRIMMED = API_URL.trim();

interface VerificationScreenProps {
  email: string;
  name: string;
  onVerificationComplete: () => void;
  onBack: () => void;
}

export function VerificationScreen({ email, name, onVerificationComplete, onBack }: VerificationScreenProps) {
  const [enteredCode, setEnteredCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");

  useEffect(() => {
    // Request verification code from server
    const requestVerificationCode = async () => {
      try {
        const response = await fetch(`${API_URL_TRIMMED}/api/auth/resend-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, name })
        });

        if (response.ok) {
          const data = await response.json();
          setVerificationCode(data.verificationCode || "");
          console.log(`[VERIFICATION] Code for ${email}: ${data.verificationCode}`);
        }
      } catch (err) {
        console.error("[VERIFICATION] Error requesting code:", err);
      }
    };

    requestVerificationCode();
  }, [email, name]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (enteredCode.length !== 6) {
      setError("El código debe tener 6 dígitos");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL_TRIMMED}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: enteredCode }),
      });

      if (response.ok) {
        toast.success("¡Email verificado exitosamente!", {
          description: "Tu cuenta está lista para usar.",
        });
        onVerificationComplete();
      } else {
        const data = await response.json();
        setError(data.error || "Código incorrecto");
      }
    } catch {
      // Fallback: check against stored code
      if (enteredCode === verificationCode) {
        toast.success("¡Email verificado exitosamente!", {
          description: "Tu cuenta está lista para usar.",
        });
        onVerificationComplete();
      } else {
        setError("Código incorrecto");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL_TRIMMED}/api/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name })
      });

      if (response.ok) {
        const data = await response.json();
        setVerificationCode(data.verificationCode || "");
        toast.success("Código reenviado", {
          description: "Hemos enviado un nuevo código a tu email.",
        });
      } else {
        setError("Error al reenviar el código");
      }
    } catch {
      toast.error("Error de conexión al reenviar el código");
    } finally {
      setIsLoading(false);
    }
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
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-10 h-10 text-brand-primary" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-brand-dark mb-2">
              Verifica tu Email
            </h2>
            <p className="text-brand-dark/60 text-center text-sm sm:text-base">
              Enviamos un código de 6 dígitos a
            </p>
            <p className="text-brand-primary font-semibold text-sm mt-1">
              {email}
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="text-center p-6 bg-brand-light rounded-2xl">
              <Mail className="w-12 h-12 text-brand-primary mx-auto mb-3" />
              <p className="text-sm text-brand-dark/60">
                Ingresa el código de verificación que enviamos a tu correo electrónico.
              </p>
              {verificationCode && (
                <p className="text-xs text-brand-dark/40 mt-2 font-mono">
                  Código de prueba: <strong>{verificationCode}</strong>
                </p>
              )}
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
                  Verificar Email
                  <CheckCircle2 className="w-5 h-5" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={isLoading}
              className="w-full text-brand-dark/60 hover:text-brand-dark text-sm font-semibold disabled:opacity-50"
            >
              ¿No recibiste el código? Reenviar
            </button>
          </form>
        </div>

        <div className="absolute -z-10 -top-4 -right-4 w-24 h-24 bg-brand-gold/20 rounded-full blur-xl animate-pulse" />
        <div className="absolute -z-10 -bottom-4 -left-4 w-32 h-32 bg-brand-primary/20 rounded-full blur-2xl animate-pulse" />
      </motion.div>
    </div>
  );
}
