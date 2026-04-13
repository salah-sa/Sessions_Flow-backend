import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, Loader2, Target, ScanFace } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleDarkFuturistic: React.FC<LoginStyleProps> = (props) => {
  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { staggerChildren: 0.1, duration: 0.5 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0, filter: "blue(10px)" },
    visible: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.4 } },
  };

  return (
    <div className="absolute inset-0 bg-[#050505] flex items-center justify-center overflow-hidden font-mono selection:bg-cyan-500/30">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_10%,transparent_100%)]" />
      
      {/* Neon Glows */}
      <div className="absolute top-0 right-[20%] w-[500px] h-[300px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-[20%] w-[500px] h-[300px] bg-emerald-500/5 blur-[150px] rounded-full pointer-events-none" />

      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="flex items-center gap-4 mb-8" variants={itemVariants}>
          <div className="w-12 h-12 border border-cyan-500/50 bg-cyan-500/10 rounded-sm flex items-center justify-center animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.5)]">
            <ScanFace className="w-6 h-6 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-[0.2em] uppercase">SYSTEM.AUTH</h1>
            <p className="text-[10px] text-cyan-500 tracking-widest uppercase opacity-70">Awaiting Clearance_</p>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="p-8 border-l-2 border-l-cyan-500 bg-[#0a0a0a]/80 backdrop-blur-md relative">
            {/* Scanline overlay */}
            <div className="absolute inset-0 pointer-events-none bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.2)_2px,rgba(0,0,0,0.2)_4px)] opacity-30 mix-blend-overlay" />
            
            <form onSubmit={props.onSubmit} className="space-y-6 relative z-10">
              <div className="space-y-2">
                <label className="text-[10px] text-cyan-500 uppercase tracking-widest flex items-center justify-between">
                  <span>{props.loginMode === "engineer" ? "IDENTIFIER" : "ALIAS"}</span>
                  <span className="opacity-50">[REQUIRED]</span>
                </label>
                <div className="relative group">
                  <Input
                    {...props.register("identifier")}
                    className="w-full h-12 bg-black/50 border border-white/10 text-white rounded-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-sm uppercase placeholder:text-white/20"
                    placeholder="ENTER DATA"
                    onFocus={() => props.handleFieldFocus("text")}
                    onBlur={props.handleFieldBlur}
                  />
                  <div className="absolute right-0 bottom-0 w-2 h-2 border-r border-b border-cyan-500 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-cyan-500 uppercase tracking-widest flex items-center justify-between">
                  <span>SECURITY_KEY</span>
                  <span className="opacity-50">[HIDDEN]</span>
                </label>
                <div className="relative group">
                  <Input
                    {...props.register("password")}
                    type="password"
                    className="w-full h-12 bg-black/50 border border-white/10 text-cyan-400 rounded-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 transition-all font-mono text-xl tracking-[0.3em] placeholder:text-white/20 placeholder:tracking-normal placeholder:text-sm"
                    placeholder="••••••"
                    onFocus={() => props.handleFieldFocus("password")}
                    onBlur={props.handleFieldBlur}
                    onChange={(e) => {
                      props.register("password").onChange(e);
                      props.handlePasswordChange(e);
                    }}
                  />
                  <div className="absolute right-0 bottom-0 w-2 h-2 border-r border-b border-cyan-500 opacity-0 group-focus-within:opacity-100 transition-opacity" />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                  type="button"
                  onClick={() => props.setLoginMode(props.loginMode === "engineer" ? "student" : "engineer")}
                  className="w-1/3 h-12 border border-white/10 text-white/50 text-xs font-bold uppercase hover:bg-white/5 hover:text-white transition-all rounded-none"
                 >
                   SWITCH
                 </button>
                 <Button
                    type="submit"
                    disabled={props.loading}
                    className="w-2/3 h-12 bg-cyan-500 hover:bg-cyan-400 text-black font-bold tracking-[0.2em] uppercase rounded-none shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)] transition-all"
                  >
                    {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "EXECUTE"}
                  </Button>
              </div>
            </form>
            
            <div className="mt-8 relative z-10">
               <div className="text-[10px] text-white/30 text-center uppercase tracking-widest mb-4">External Protocols</div>
               <SocialButtons mode="icon-only" layout="row" theme="dark" />
            </div>
            
            {/* Corner Accents */}
            <div className="absolute top-0 left-0 w-2 h-2 border-l border-t border-cyan-500 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-r border-b border-cyan-500 pointer-events-none" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
