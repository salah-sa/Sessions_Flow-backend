import React from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleSplitScreen: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-white flex overflow-hidden">
      {/* Left side imagery */}
      <motion.div 
        className="hidden lg:flex w-1/2 relative bg-var(--ui-sidebar-bg) border-r border-slate-200/20"
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <img 
          src="https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2000&auto=format&fit=crop" 
          alt="Abstract 3D Art"
          className="absolute inset-0 w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-var(--ui-sidebar-bg) via-var(--ui-sidebar-bg)/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 text-white">
          <h2 className="text-4xl font-bold mb-4">Empower Your Workflow.</h2>
          <p className="text-slate-300 text-lg max-w-md">Access your dashboard to manage sessions, analyze metrics, and streamline administrative tasks.</p>
        </div>
      </motion.div>

      {/* Right side form */}
      <motion.div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white"
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
      >
        <div className="w-full max-w-[420px]">
          <div className="mb-10 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold text-var(--ui-sidebar-bg) mb-2">Welcome Back</h1>
            <p className="text-slate-500">Sign in to your account</p>
          </div>

          <div className="flex bg-slate-100 rounded-lg p-1 mb-8">
            <button
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${props.loginMode === "engineer" ? "bg-white shadow-sm text-var(--ui-sidebar-bg)" : "text-slate-500 hover:text-var(--ui-surface)"}`}
            >
              Engineer
            </button>
            <button
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-all ${props.loginMode === "student" ? "bg-white shadow-sm text-var(--ui-sidebar-bg)" : "text-slate-500 hover:text-var(--ui-surface)"}`}
            >
              Student
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-5">
             <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  {props.loginMode === "engineer" ? "Email Address" : "Username"}
                </label>
                <div className="relative group">
                  <Input
                    {...props.register("identifier")}
                    className="w-full h-12 border-slate-300 text-var(--ui-sidebar-bg) rounded-lg focus:border-var(--ui-surface) focus:ring-1 focus:ring-var(--ui-surface) transition-all font-medium ps-11"
                    placeholder={props.loginMode === "engineer" ? "name@company.com" : "Enter username"}
                    onFocus={() => props.handleFieldFocus("text")}
                    onBlur={props.handleFieldBlur}
                  />
                  {props.loginMode === "engineer" ? (
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-var(--ui-surface) transition-colors" />
                  ) : (
                    <UserIcon className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-var(--ui-surface) transition-colors" />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                   <label className="text-sm font-semibold text-slate-700">Password</label>
                   <button type="button" className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">Forgot?</button>
                </div>
                <div className="relative group">
                  <Input
                    {...props.register("password")}
                    type="password"
                    className="w-full h-12 border-slate-300 text-var(--ui-sidebar-bg) rounded-lg focus:border-var(--ui-surface) focus:ring-1 focus:ring-var(--ui-surface) transition-all font-medium ps-11"
                    placeholder="••••••••"
                    onFocus={() => props.handleFieldFocus("password")}
                    onBlur={props.handleFieldBlur}
                    onChange={(e) => {
                      props.register("password").onChange(e);
                      props.handlePasswordChange(e);
                    }}
                  />
                  <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-var(--ui-surface) transition-colors" />
                </div>
              </div>

              <Button
                 type="submit"
                 disabled={props.loading}
                 className="w-full h-12 bg-var(--ui-sidebar-bg) text-white hover:bg-var(--ui-surface) font-semibold rounded-lg mt-2 shadow-lg shadow-var(--ui-sidebar-bg)/20 transition-all"
              >
                 {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "Sign In"}
              </Button>
          </form>

          <div className="relative flex items-center my-8">
             <div className="flex-grow border-t border-slate-200"></div>
             <span className="flex-shrink-0 mx-4 text-xs font-semibold text-slate-400 uppercase tracking-widest">Or Continue With</span>
             <div className="flex-grow border-t border-slate-200"></div>
          </div>

          <SocialButtons mode="full" layout="column" theme="light" />

          <p className="mt-8 text-center text-sm font-medium text-slate-600">
             Don't have an account?{" "}
             <button onClick={() => props.onNavigate("/register")} className="text-blue-600 font-semibold hover:underline">
               Sign up now
             </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

