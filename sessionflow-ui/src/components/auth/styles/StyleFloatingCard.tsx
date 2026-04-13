import React from "react";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, User as UserIcon } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleFloatingCard: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-[#0A0A0A] flex items-center justify-center overflow-hidden">
      {/* 3D Abstract Void Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.15)_0%,transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vh] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.1)_0%,transparent_50%)] pointer-events-none" />
      
      {/* Simulated 3D Floor Grid */}
      <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [transform:perspective(500px)_rotateX(60deg)] [transform-origin:bottom_center] opacity-50" />

      <motion.div
        className="w-full max-w-[420px] relative z-10"
        initial={{ opacity: 0, y: 50, rotateX: 10 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="p-8 rounded-2xl bg-[#111111] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">Welcome Back</h1>
            <p className="text-white/40 text-sm">Sign in to your dashboard</p>
          </div>

          <div className="flex bg-[#1A1A1A] rounded-xl p-1 mb-8 border border-white/5">
            <button
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${props.loginMode === "engineer" ? "bg-[#2A2A2A] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}
            >
              Engineer
            </button>
            <button
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${props.loginMode === "student" ? "bg-[#2A2A2A] text-white shadow-sm" : "text-white/40 hover:text-white/80"}`}
            >
              Student
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-4">
             <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 ms-1 uppercase tracking-wider">
                  {props.loginMode === "engineer" ? "Email Address" : "Username"}
                </label>
                <Input
                  {...props.register("identifier")}
                  className="w-full h-12 bg-[#1A1A1A] border-white/10 text-white rounded-xl focus:bg-[#222] focus:border-blue-500/50 transition-all font-medium"
                  placeholder={props.loginMode === "engineer" ? "name@example.com" : "Enter username"}
                  onFocus={() => props.handleFieldFocus("text")}
                  onBlur={props.handleFieldBlur}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-white/50 ms-1 uppercase tracking-wider flex justify-between">
                  <span>Password</span>
                  <button type="button" className="text-blue-400 hover:text-blue-300 transition-colors lowercase tracking-normal">Forgot?</button>
                </label>
                <Input
                  {...props.register("password")}
                  type="password"
                  className="w-full h-12 bg-[#1A1A1A] border-white/10 text-white rounded-xl focus:bg-[#222] focus:border-blue-500/50 transition-all font-medium"
                  placeholder="••••••••"
                  onFocus={() => props.handleFieldFocus("password")}
                  onBlur={props.handleFieldBlur}
                  onChange={(e) => {
                    props.register("password").onChange(e);
                    props.handlePasswordChange(e);
                  }}
                />
              </div>

              <Button
                 type="submit"
                 disabled={props.loading}
                 className="w-full h-12 bg-white text-black hover:bg-slate-200 font-semibold rounded-xl mt-6 transition-all"
              >
                 {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-black" /> : "Sign In"}
              </Button>
          </form>

          <div className="mt-8">
             <div className="relative flex items-center mb-6">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-xs text-white/30 uppercase tracking-widest">Or Continue With</span>
                <div className="flex-grow border-t border-white/10"></div>
             </div>
             <SocialButtons mode="full" layout="row" theme="dark" />
          </div>

          <div className="mt-8 text-center border-t border-white/5 pt-6">
             <p className="text-sm text-white/40">
               New to the platform?{" "}
               <button onClick={() => props.onNavigate("/register")} className="text-white font-medium hover:text-blue-400 transition-colors">
                 Create an account
               </button>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
