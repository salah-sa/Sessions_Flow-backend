import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleSaaS: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-[#fbfbfb] flex flex-col items-center justify-center p-6 text-[#171717] font-sans">
      {/* Light Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <motion.div
        className="w-full max-w-[380px] relative z-10"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
         {/* Subtle Logo/Header */}
        <div className="flex flex-col items-center mb-8">
           <div className="w-10 h-10 bg-white border border-[#eaeaea] shadow-sm rounded-xl flex items-center justify-center mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-black">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
           </div>
           <h1 className="text-2xl font-semibold tracking-tight text-[#111]">Log in to SessionFlow</h1>
           <p className="text-[#666] text-sm mt-1">Welcome back, securely authenticate below.</p>
        </div>

        <div className="bg-white border border-[#eaeaea] shadow-[0_4px_14px_0_rgba(0,0,0,0.03)] rounded-2xl p-6">
          <div className="flex bg-[#f5f5f5] rounded-lg p-1 mb-6 border border-[#eaeaea]">
            <button
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${props.loginMode === "engineer" ? "bg-white shadow-sm border border-[#eaeaea] text-black" : "text-[#666] hover:text-[#111]"}`}
            >
              Engineer
            </button>
            <button
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${props.loginMode === "student" ? "bg-white shadow-sm border border-[#eaeaea] text-black" : "text-[#666] hover:text-[#111]"}`}
            >
              Student
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-4">
             <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-[#444]">
                  {props.loginMode === "engineer" ? "Email Address" : "Username"}
                </label>
                <Input
                  {...props.register("identifier")}
                  className="w-full h-10 bg-white border-[#eaeaea] text-[#111] rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm"
                  placeholder={props.loginMode === "engineer" ? "Enter your email" : "Enter your username"}
                  onFocus={() => props.handleFieldFocus("text")}
                  onBlur={props.handleFieldBlur}
                />
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                   <label className="text-[13px] font-medium text-[#444]">Password</label>
                   <button type="button" className="text-[13px] font-medium text-[#666] hover:text-black transition-colors line-through decoration-transparent hover:decoration-[#eaeaea]">Forgot password?</button>
                </div>
                <Input
                  {...props.register("password")}
                  type="password"
                  className="w-full h-10 bg-white border-[#eaeaea] text-[#111] rounded-lg focus:border-black focus:ring-1 focus:ring-black transition-all text-sm shadow-sm"
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
                 className="w-full h-10 bg-black text-white hover:bg-[#333] font-medium rounded-lg mt-6 transition-all text-sm border border-transparent"
              >
                 {props.loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-white" /> : "Sign in"}
              </Button>
          </form>

          <div className="relative flex items-center my-6">
             <div className="flex-grow border-t border-[#eaeaea]"></div>
             <span className="flex-shrink-0 mx-4 text-[12px] font-medium text-[#888]">OR</span>
             <div className="flex-grow border-t border-[#eaeaea]"></div>
          </div>

          <SocialButtons mode="full" layout="column" theme="light" />
        </div>

        <div className="mt-8 text-center">
          <p className="text-[13px] text-[#666]">
             Don't have an account?{" "}
             <button onClick={() => props.onNavigate("/register")} className="text-[#111] font-medium hover:underline">
               Sign up
             </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
