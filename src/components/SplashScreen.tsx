import { motion } from "motion/react";
import { FileText, Sparkles } from "lucide-react";

export function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-brand-dark flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/20 rounded-full blur-[120px]" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative flex flex-col items-center"
      >
        <div className="relative mb-6">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0], y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-32 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.2)] overflow-hidden p-2"
          >
            <img 
              src="https://i.ibb.co/v4Xz1rM/logo-conta-ai.png" 
              alt="My Conta-AI Logo" 
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://picsum.photos/seed/robot/200/200";
              }}
            />
          </motion.div>
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-4 -right-4"
          >
            <Sparkles className="w-10 h-10 text-brand-gold" />
          </motion.div>
        </div>
        
        <motion.h1
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-4xl font-display font-bold text-white tracking-tight mb-2"
        >
          My Conta-AI
        </motion.h1>
        
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-brand-primary font-semibold tracking-widest uppercase text-sm"
        >
          Facturador CFDI 4.0
        </motion.p>
      </motion.div>
      
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: 200 }}
        transition={{ delay: 1, duration: 1.5, ease: "easeInOut" }}
        className="mt-12 h-1 bg-brand-primary/30 rounded-full overflow-hidden"
      >
        <motion.div
          animate={{ x: [-200, 200] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-full h-full bg-brand-primary"
        />
      </motion.div>
    </div>
  );
}
