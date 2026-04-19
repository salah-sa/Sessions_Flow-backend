import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { loginUser } from "../api/authService";
import { useTranslation } from "react-i18next";
import { useSharedAuth } from "../hooks/useSharedAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { StyleGradientAnimated } from "../components/auth/styles/StyleGradientAnimated";

const loginSchema = z.object({
  identifier: z.string().min(3, "Must be at least 3 characters"),
  password: z.string().min(6, "Must be at least 6 characters"),
  studentId: z.string().optional(),
  engineerCode: z.string().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const sharedAuth = useSharedAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true);
    try {
      const result = await loginUser(
        data.identifier,
        data.password,
        sharedAuth.rememberMe,
        sharedAuth.loginMode === "student" ? "Student" : "Admin",
        sharedAuth.loginMode === "student" ? data.studentId : undefined,
        sharedAuth.loginMode === "student" ? data.engineerCode : undefined
      );

      if (result.success) {
        // Force location re-consent for students on every login
        const isStudent = result.user?.role === "Student" || sharedAuth.loginMode === "student";
        
        if (isStudent) {
          import("../store/stores").then((m) => {
            const authStore = m.useAuthStore.getState();
            authStore.setStudentLocation(""); 
            // @ts-ignore - we know it's there
            authStore.setStudentLocationData(null as any);
          });
        }
        
        sharedAuth.setMascotState("success");
        toast.success(t("auth.login_success") || "Login successful!");
        
        // Ensure student lands on student dashboard even if portal was mismarked
        setTimeout(() => {
          sharedAuth.onNavigate("/dashboard");
        }, 800);
      } else {
        sharedAuth.setMascotState("error");
        toast.error(result.error || t("auth.login_failed") || "Login failed");
        setTimeout(() => sharedAuth.setMascotState("idle"), 1000);
      }
    } catch (err: any) {
      sharedAuth.setMascotState("error");
      toast.error(err.message || t("auth.login_failed") || "Login failed");
      setTimeout(() => sharedAuth.setMascotState("idle"), 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout theme="dark">
      <StyleGradientAnimated 
        {...sharedAuth}
        register={register}
        errors={errors}
        onSubmit={handleSubmit(onSubmit)}
        loading={loading}
      />
    </AuthLayout>
  );
};

export default LoginPage;
