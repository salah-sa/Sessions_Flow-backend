import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User as UserIcon, Loader2, ArrowRight, Hash, Key } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import LoginMascot from "../LoginMascot";
import { useTranslation } from "react-i18next";
import { SocialButtons } from "../SocialButtons";

export const StyleNeumorphism: React.FC<LoginStyleProps> = (props) => {
  const { t } = useTranslation();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const neuBox = "bg-[#e0e5ec] rounded-3xl shadow-[9px_9px_16px_rgb(163,177,198,0.6),-9px_-9px_16px_rgba(255,255,255,0.5)]";
  const neuInner = "bg-[#e0e5ec] rounded-xl shadow-[inset_6px_6px_10px_0_rgba(163,177,198,0.7),inset_-6px_-6px_10px_0_rgba(255,255,255,0.8)]";
  const neuButton = "bg-[#e0e5ec] rounded-xl text-slate-600 font-bold shadow-[6px_6px_10px_0_rgba(163,177,198,0.5),-6px_-6px_10px_0_rgba(255,255,255,0.8)] active:shadow-[inset_4px_4px_6px_0_rgba(163,177,198,0.5),inset_-4px_-4px_6px_0_rgba(255,255,255,0.8)] transition-all";

  return (
    <div className="absolute inset-0 bg-[#e0e5ec] flex items-center justify-center">
      <motion.div
        className="w-full max-w-md px-6 relative z-10"
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <motion.div className="flex flex-col items-center mb-8" variants={itemVariants}>
          <div className={`p-4 rounded-full ${neuBox} mb-4`}>
             <LoginMascot state={props.mascotState} passwordStrength={props.passwordStrength} />
          </div>
          <h1 className="text-3xl font-sora font-extrabold text-slate-700 tracking-tight">
            SessionFlow
          </h1>
        </motion.div>

        <motion.div variants={itemVariants} className="mb-6 flex justify-center gap-4">
            <button
              type="button"
              onClick={() => props.setLoginMode("engineer")}
              className={`px-6 py-3 text-xs uppercase tracking-widest ${props.loginMode === "engineer" ? neuInner + " text-emerald-600 font-bold" : neuButton}`}
            >
              Engineer
            </button>
            <button
              type="button"
              onClick={() => props.setLoginMode("student")}
              className={`px-6 py-3 text-xs uppercase tracking-widest ${props.loginMode === "student" ? neuInner + " text-emerald-600 font-bold" : neuButton}`}
            >
              Student
            </button>
        </motion.div>

        <motion.div variants={itemVariants} className={`p-8 ${neuBox}`}>
          <form onSubmit={props.onSubmit} className="space-y-6 text-slate-600">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ms-2">
                {props.loginMode === "engineer" ? "Email Address" : "Username"}
              </label>
              <div className="relative">
                {props.loginMode === "engineer" ? <Mail className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" /> : <UserIcon className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />}
                <Input
                  {...props.register("identifier")}
                  className={`ps-12 h-14 border-none text-slate-700 focus:ring-0 ${neuInner}`}
                  onFocus={() => props.handleFieldFocus("text")}
                  onBlur={props.handleFieldBlur}
                  style={{ backgroundColor: "transparent" }}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ms-2">Password</label>
              <div className="relative">
                <Lock className="absolute start-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  {...props.register("password")}
                  type="password"
                  className={`ps-12 h-14 border-none text-slate-700 focus:ring-0 ${neuInner}`}
                  onFocus={() => props.handleFieldFocus("password")}
                  onBlur={props.handleFieldBlur}
                  onChange={(e) => {
                    props.register("password").onChange(e);
                    props.handlePasswordChange(e);
                  }}
                  style={{ backgroundColor: "transparent" }}
                />
              </div>
            </div>

             <div className="flex justify-between items-center px-1">
                 <label className="flex items-center gap-2 text-xs text-slate-500 font-medium cursor-pointer">
                   <input type="checkbox" className="rounded border-none shadow-[inset_2px_2px_4px_rgba(163,177,198,0.7),inset_-2px_-2px_4px_rgba(255,255,255,0.8)] bg-transparent text-emerald-500 focus:ring-0" />
                   Remember me
                 </label>
                 <button type="button" className="text-xs text-slate-500 font-medium hover:text-emerald-600">Recovery</button>
             </div>

            <button
               type="submit"
               disabled={props.loading}
               className={`w-full h-14 mt-4 flex items-center justify-center gap-2 ${neuButton} !text-emerald-600`}
            >
               {props.loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8">
            <SocialButtons mode="full" layout="column" theme="light" />
          </div>

          <p className="mt-8 text-center text-xs text-slate-500 font-medium">
             New here? <button onClick={() => props.onNavigate("/register")} className="text-emerald-600 font-bold hover:underline">Sign up</button>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};
