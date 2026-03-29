import { motion } from "motion/react";
import React, { useState } from "react";
import { LogIn, User, Lock, Mail, ChevronRight } from "lucide-react";
import { cn } from "../lib/utils";

interface LoginScreenProps {
  onLogin: () => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate login
    setTimeout(() => {
      setIsLoading(false);
      onLogin();
    }, 1500);
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
                src="https://i.ibb.co/v4Xz1rM/logo-conta-ai.png" 
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
          
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-brand-dark/5 text-center">
            <p className="text-sm text-brand-dark/60">
              ¿No tienes cuenta? <button className="text-brand-primary font-bold hover:underline">Regístrate</button>
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
