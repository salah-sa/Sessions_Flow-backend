import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleMinimalClean: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-[#fafafa] flex flex-col items-center justify-center p-6 text-[var(--ui-sidebar-bg)] font-sans">
      <motion.div
        className="w-full max-w-[400px]"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="text-center mb-12">
          <h1 className="text-4xl font-semibold tracking-tight text-black mb-3">Sign In</h1>
          <p className="text-slate-500 text-[15px]">Enter your credentials to continue</p>
        </div>

        <div className="flex bg-slate-100 rounded-lg p-1 mb-8">
          <button
            onClick={() => props.setLoginMode("engineer")}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${props.loginMode === "engineer" ? "bg-white shadow-sm text-black" : "text-slate-500 hover:text-[var(--ui-surface)]"}`}
          >
            Engineer
          </button>
          <button
            onClick={() => props.setLoginMode("student")}
            className={`flex-1 py-1.5 text-[13px] font-medium rounded-md transition-all ${props.loginMode === "student" ? "bg-white shadow-sm text-black" : "text-slate-500 hover:text-[var(--ui-surface)]"}`}
          >
            Student
          </button>
        </div>

        <form onSubmit={props.onSubmit} className="space-y-5">
          <div>
             <Input
               {...props.register("identifier")}
               placeholder={props.loginMode === "engineer" ? "Email address" : "Username"}
               className="w-full h-12 bg-white border-slate-200 text-[var(--ui-sidebar-bg)] rounded-lg shadow-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all text-[15px]"
               onFocus={() => props.handleFieldFocus("text")}
               onBlur={props.handleFieldBlur}
             />
          </div>
          <div>
             <Input
               {...props.register("password")}
               type="password"
               placeholder="Password"
               className="w-full h-12 bg-white border-slate-200 text-[var(--ui-sidebar-bg)] rounded-lg shadow-sm focus:border-slate-400 focus:ring-1 focus:ring-slate-200 transition-all text-[15px]"
               onFocus={() => props.handleFieldFocus("password")}
               onBlur={props.handleFieldBlur}
               onChange={(e) => {
                 props.register("password").onChange(e);
                 props.handlePasswordChange(e);
               }}
             />
          </div>

          <div className="flex justify-between items-center pt-2">
            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input type="checkbox" className="rounded border-slate-300 text-black focus:ring-black" />
              Remember me
            </label>
            <button type="button" className="text-[13px] text-slate-600 hover:text-black hover:underline">Forgot password?</button>
          </div>

          <Button
             type="submit"
             disabled={props.loading}
             className="w-full h-12 bg-black hover:bg-[var(--ui-surface)] text-white font-medium rounded-lg mt-4 transition-colors text-[15px]"
          >
             {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Continue"}
          </Button>
        </form>

        <div className="relative flex items-center my-8">
           <div className="flex-grow border-t border-slate-200"></div>
           <span className="flex-shrink-0 mx-4 text-[13px] text-slate-400">Or continue with</span>
           <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <SocialButtons mode="full" layout="column" theme="light" />

        <div className="mt-12 text-center">
          <p className="text-[14px] text-slate-500">
             Don't have an account?{" "}
             <button onClick={() => props.onNavigate("/register")} className="text-black font-medium hover:underline">
               Sign up
             </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

