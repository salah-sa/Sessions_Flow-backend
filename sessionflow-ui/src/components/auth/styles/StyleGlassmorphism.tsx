import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, Loader2, ArrowRight, Hash, Key } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import LoginMascot from "../LoginMascot";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/utils";
import { SocialButtons } from "../SocialButtons";

export const StyleGlassmorphism: React.FC<LoginStyleProps> = (props) => {
  const { t } = useTranslation();
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: [0.23, 1, 0.32, 1] } },
  };

  return (
    <>
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute w-auto min-w-full min-h-full max-w-none object-cover opacity-60 z-0"
        src="https://media.tenor.com/TfPMv8lK1D0AAAPo/lofi-girl.mp4"
      />
      
      {/* Blurry Overlays */}
      <div className="absolute inset-0 bg-[var(--ui-sidebar-bg)]/30 backdrop-blur-[2px] z-0" />
      <div className="absolute top-[-15%] start-[-10%] w-[40%] h-[40%] bg-emerald-500/20 blur-[120px] rounded-full z-0" />
      <div className="absolute bottom-[-15%] end-[-10%] w-[40%] h-[40%] bg-cyan-500/20 blur-[120px] rounded-full z-0" />

      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="flex flex-col items-center mb-6" variants={itemVariants}>
          <LoginMascot state={props.mascotState} passwordStrength={props.passwordStrength} />
          <h1 className="text-4xl font-sora font-black text-white tracking-tighter uppercase mt-6 leading-none">
            Welcome <span className="text-emerald-400">Back</span>
          </h1>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex p-1 bg-white/5 backdrop-blur-xl rounded-xl border border-white/20 mb-6 relative shadow-lg">
            <div
              className={cn(
                "absolute top-1 bottom-1 w-[48%] bg-white/20 rounded-lg transition-transform duration-500 backdrop-blur-md border border-white/20",
                props.loginMode === "student" ? "translate-x-[104%] rtl:-translate-x-[104%]" : "translate-x-0"
              )}
            />
            <button
              type="button"
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors relative z-10 ${props.loginMode === "engineer" ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              Engineer
            </button>
            <button
              type="button"
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors relative z-10 ${props.loginMode === "student" ? "text-white" : "text-white/60 hover:text-white"}`}
            >
              Student
            </button>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="p-8 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
            <form onSubmit={props.onSubmit} className="space-y-5">
              <motion.div className="space-y-2 text-start" variants={itemVariants}>
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest ms-1">
                  {props.loginMode === "engineer" ? "Email" : "Username"}
                </label>
                <div className="relative group">
                  {props.loginMode === "engineer" ? (
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-white transition-colors" />
                  ) : (
                    <UserIcon className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-white transition-colors" />
                  )}
                  <Input
                    {...props.register("identifier")}
                    variant="auth"
                    className="ps-11 h-12 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-white/30"
                    onFocus={() => props.handleFieldFocus("text")}
                    onBlur={props.handleFieldBlur}
                  />
                </div>
                {props.errors.identifier && <p className="text-xs text-red-300 mt-1">{String(props.errors.identifier.message)}</p>}
              </motion.div>

              <motion.div className="space-y-2 text-start" variants={itemVariants}>
                <label className="text-[10px] font-bold text-white/70 uppercase tracking-widest ms-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 group-focus-within:text-white transition-colors" />
                  <Input
                    {...props.register("password")}
                    variant="auth"
                    type="password"
                    className="ps-11 h-12 border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-white/30"
                    onFocus={() => props.handleFieldFocus("password")}
                    onBlur={props.handleFieldBlur}
                    onChange={(e) => {
                      props.register("password").onChange(e);
                      props.handlePasswordChange(e);
                    }}
                  />
                </div>
                {props.errors.password && <p className="text-xs text-red-300 mt-1">{String(props.errors.password.message)}</p>}
              </motion.div>

              <AnimatePresence>
                {props.loginMode === "student" && (
                  <motion.div
                    className="grid grid-cols-2 gap-4"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                     <div className="space-y-2 text-start">
                      <label className="text-[10px] font-bold text-white/70 uppercase ms-1">Student ID</label>
                      <div className="relative group">
                        <Hash className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <Input
                          {...props.register("studentId")}
                          className="ps-11 h-12 border-white/10 bg-white/5 text-white text-sm"
                          onFocus={() => props.handleFieldFocus("text")}
                          onBlur={props.handleFieldBlur}
                        />
                      </div>
                    </div>
                    <div className="space-y-2 text-start">
                      <label className="text-[10px] font-bold text-white/70 uppercase ms-1">Access Code</label>
                      <div className="relative group">
                        <Key className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                        <Input
                          {...props.register("engineerCode")}
                          type="password"
                          className="ps-11 h-12 border-white/10 bg-white/5 text-white text-sm"
                          onFocus={() => props.handleFieldFocus("text")}
                          onBlur={props.handleFieldBlur}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

               <div className="flex justify-between items-center px-1">
                 <label className="flex items-center gap-2 text-xs text-white/70 hover:text-white cursor-pointer">
                   <input type="checkbox" className="rounded bg-white/10 border-white/20 text-emerald-500 focus:ring-emerald-500/50" />
                   Remember me
                 </label>
                 <button type="button" className="text-xs text-white/70 hover:text-white hover:underline">Forgot Password?</button>
               </div>

              <Button
                type="submit"
                disabled={props.loading}
                className="w-full h-12 bg-white/20 hover:bg-white/30 border border-white/30 text-white shadow-xl backdrop-blur-md transition-all rounded-xl mt-4"
              >
                {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-white/50">or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              <SocialButtons mode="icon-only" layout="row" theme="dark" />
            </div>

            <div className="mt-8 text-center">
               <p className="text-xs text-white/60">
                 Don't have an account?{" "}
                 <button onClick={() => props.onNavigate("/register")} className="text-white font-bold hover:underline">
                   Create one
                 </button>
               </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
};

