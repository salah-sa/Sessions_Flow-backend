import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleMaterialDesign3: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-[#F4F1EA] flex items-center justify-center font-sans">
      <motion.div
        className="w-full max-w-[400px] relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} // MD3 standard easing
      >
        <div className="bg-[#FFFBFC] p-8 md:p-10 rounded-[32px] shadow-[0px_8px_24px_rgba(149,157,165,0.2)]">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-normal text-[#1D1B20] mb-2">Welcome</h1>
            <p className="text-[#49454F] text-sm">Sign in to SessionFlow</p>
          </div>

          <div className="flex bg-[#EADDFF]/30 p-1 rounded-full mb-8">
            <button
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${props.loginMode === "engineer" ? "bg-[#EADDFF] text-[#21005D]" : "text-[#49454F] hover:bg-[#EADDFF]/50"}`}
            >
              Engineer
            </button>
            <button
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${props.loginMode === "student" ? "bg-[#EADDFF] text-[#21005D]" : "text-[#49454F] hover:bg-[#EADDFF]/50"}`}
            >
              Student
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-6">
             {/* MD3 Filled Text Field */}
             <div className="relative group">
                <Input
                  {...props.register("identifier")}
                  className="w-full h-14 bg-[#E7E0EC] border-b-2 border-b-[#49454F] text-[#1D1B20] rounded-t-lg rounded-b-none focus:bg-[#E7E0EC] focus:border-b-[#6750A4] focus:ring-0 transition-all font-normal pt-4 px-4 peer"
                  placeholder=" "
                  onFocus={() => props.handleFieldFocus("text")}
                  onBlur={props.handleFieldBlur}
                />
                <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#49454F] text-base transition-all duration-200 peer-focus:-top-1 peer-focus:text-xs peer-focus:text-[#6750A4] peer-[&:not(:placeholder-shown)]:-top-1 peer-[&:not(:placeholder-shown)]:text-xs">
                  {props.loginMode === "engineer" ? "Email Address" : "Username"}
                </label>
              </div>

              <div className="relative group">
                <Input
                  {...props.register("password")}
                  type="password"
                  className="w-full h-14 bg-[#E7E0EC] border-b-2 border-b-[#49454F] text-[#1D1B20] rounded-t-lg rounded-b-none focus:bg-[#E7E0EC] focus:border-b-[#6750A4] focus:ring-0 transition-all font-normal pt-4 px-4 peer text-lg tracking-widest focus:tracking-widest"
                  placeholder=" "
                  onFocus={() => props.handleFieldFocus("password")}
                  onBlur={props.handleFieldBlur}
                  onChange={(e) => {
                    props.register("password").onChange(e);
                    props.handlePasswordChange(e);
                  }}
                />
                <label className="absolute left-4 top-1/2 -translate-y-1/2 text-[#49454F] text-base transition-all duration-200 peer-focus:-top-1 peer-focus:text-xs peer-focus:text-[#6750A4] peer-[&:not(:placeholder-shown)]:-top-1 peer-[&:not(:placeholder-shown)]:text-xs">
                  Password
                </label>
              </div>

              <div className="flex justify-end pt-2">
                 <button type="button" className="text-sm font-medium text-[#6750A4] hover:text-[#21005D]">Forgot password?</button>
              </div>

              {/* MD3 Filled Button */}
              <Button
                 type="submit"
                 disabled={props.loading}
                 className="w-full h-12 bg-[#6750A4] text-white hover:bg-[#6750A4]/90 hover:shadow-md font-medium rounded-full mt-4 transition-all duration-300"
              >
                 {props.loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white" /> : "Sign in"}
              </Button>
          </form>

          <div className="relative flex items-center my-8">
             <div className="flex-grow border-t border-[#CAC4D0]"></div>
             <span className="flex-shrink-0 mx-4 text-xs font-medium text-[#49454F]">or</span>
             <div className="flex-grow border-t border-[#CAC4D0]"></div>
          </div>

          <SocialButtons mode="full" layout="column" theme="light" />

          <div className="mt-8 text-center pt-2">
             <p className="text-sm text-[#49454F]">
               Don't have an account?{" "}
               <button onClick={() => props.onNavigate("/register")} className="text-[#6750A4] font-medium hover:text-[#21005D]">
                 Create account
               </button>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
