import React from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { Input, Button } from "../../ui";
import { LoginStyleProps } from "../types";
import { SocialButtons } from "../SocialButtons";

export const StyleCyberpunk: React.FC<LoginStyleProps> = (props) => {
  return (
    <div className="absolute inset-0 bg-[#fcee0a] flex items-center justify-center overflow-hidden font-sans uppercase">
      {/* Glitch Overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-40 mix-blend-overlay pointer-events-none" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.1)_2px,rgba(0,0,0,0.1)_4px)] pointer-events-none" />

      <motion.div
        className="w-full max-w-[450px] relative z-10"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "linear" }}
      >
        <div className="bg-black p-8 relative shadow-[20px_20px_0_0_rgba(0,0,0,0.2)] border-2 border-black" style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 30px), calc(100% - 30px) 100%, 0 100%)' }}>
          {/* Cyberpunk Accents */}
          <div className="absolute top-0 right-0 w-32 h-2 bg-[#fcee0a]" />
          <div className="absolute bottom-0 left-0 w-32 h-2 bg-cyan-400" />
          <div className="absolute top-4 left-4 text-cyan-400 text-[10px] tracking-widest">SYS.REQ 04_</div>
          
          <div className="mt-6 mb-8">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-1">ACCESS</h1>
            <h1 className="text-4xl font-black text-[#fcee0a] tracking-tighter bg-black absolute top-14 left-8 -z-10 translate-x-1 translate-y-1">ACCESS</h1>
            <p className="text-cyan-400 text-xs tracking-widest font-bold">WARNING: RESTRICTED AREA</p>
          </div>

          <div className="flex gap-2 mb-8">
            <button
              onClick={() => props.setLoginMode("engineer")}
              className={`flex-1 py-3 text-xs font-black tracking-widest border-2 transition-all ${props.loginMode === "engineer" ? "bg-cyan-400 border-cyan-400 text-black" : "bg-black border-white/20 text-white hover:border-cyan-400"}`}
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
            >
              ENGINEER
            </button>
            <button
              onClick={() => props.setLoginMode("student")}
              className={`flex-1 py-3 text-xs font-black tracking-widest border-2 transition-all ${props.loginMode === "student" ? "bg-cyan-400 border-cyan-400 text-black" : "bg-black border-white/20 text-white hover:border-cyan-400"}`}
              style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)' }}
            >
              STUDENT
            </button>
          </div>

          <form onSubmit={props.onSubmit} className="space-y-6">
             <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/50 tracking-widest flex justify-between">
                  <span>{props.loginMode === "engineer" ? "IDENTIFIER [EMAIL]" : "ALIAS [USERNAME]"}</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    {...props.register("identifier")}
                    className="w-full h-14 bg-black border-2 border-white/20 text-white focus:border-[#fcee0a] focus:ring-0 transition-all font-bold tracking-widest focus:bg-white/5"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)', borderRadius: 0 }}
                    placeholder={props.loginMode === "engineer" ? "ENTER EMAIL" : "ENTER ALIAS"}
                    onFocus={() => props.handleFieldFocus("text")}
                    onBlur={props.handleFieldBlur}
                  />
                  <div className="absolute right-0 bottom-0 w-4 h-4 border-b-2 border-r-2 border-transparent group-focus-within:border-[#fcee0a]" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/50 tracking-widest flex justify-between">
                  <span>SECURITY_KEY</span>
                  <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Input
                    {...props.register("password")}
                    type="password"
                    className="w-full h-14 bg-black border-2 border-white/20 text-[#fcee0a] focus:border-[#fcee0a] focus:ring-0 transition-all font-black tracking-[0.3em] text-lg focus:bg-white/5"
                    style={{ clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%)', borderRadius: 0 }}
                    placeholder="••••••••"
                    onFocus={() => props.handleFieldFocus("password")}
                    onBlur={props.handleFieldBlur}
                    onChange={(e) => {
                      props.register("password").onChange(e);
                      props.handlePasswordChange(e);
                    }}
                  />
                </div>
              </div>

              <Button
                 type="submit"
                 disabled={props.loading}
                 className="w-full h-16 bg-[#fcee0a] text-black hover:bg-white font-black tracking-widest text-lg mt-8 transition-colors group relative border-2 border-transparent hover:border-black"
                 style={{ borderRadius: 0, clipPath: 'polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 15px 100%, 0 calc(100% - 15px))' }}
              >
                 <span className="absolute left-2 top-2 text-[10px] opacity-50">#01</span>
                 {props.loading ? <Loader2 className="w-6 h-6 animate-spin mx-auto text-black" /> : "INITIALIZE LOGIN"}
              </Button>
          </form>

          <div className="mt-8 border-t-2 border-white/10 pt-8">
             <div className="text-[10px] text-cyan-400 tracking-widest mb-4">CONNECT.VIA</div>
             <SocialButtons mode="icon-only" layout="row" theme="dark" />
          </div>

          <div className="mt-8 pt-4 flex justify-between items-center">
             <p className="text-[10px] text-white/40 tracking-widest group cursor-pointer hover:text-white">
               NO DOSSIER? <span className="text-cyan-400 group-hover:underline">REGISTER.NEW</span>
             </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
