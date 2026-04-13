import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { registerEngineer, registerStudent } from "../api/authService";
import { useTranslation } from "react-i18next";
import { useSharedAuth } from "../hooks/useSharedAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { StyleGradientAnimated } from "../components/auth/styles/StyleGradientAnimated";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  identifier: z.string().min(3, "Must be at least 3 characters"),
  password: z.string().min(6, "Must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Must be at least 6 characters"),
  studentId: z.string().optional(),
  engineerCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const sharedAuth = useSharedAuth();
  
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true);
    try {
      let result;
      
      if (sharedAuth.loginMode === "engineer") {
        result = await registerEngineer(
          data.name,
          data.identifier,
          data.password
        );
      } else {
        if (!data.studentId || !data.engineerCode) {
          toast.error("Student ID and Engineer Code are required");
          setLoading(false);
          return;
        }
        result = await registerStudent(
          data.name,
          data.identifier,
          data.password,
          data.studentId,
          data.engineerCode
        );
      }

      if (result.success) {
        sharedAuth.setMascotState("success");
        toast.success(t("auth.register_success") || "Registration successful!");
        setTimeout(() => sharedAuth.onNavigate("/login"), 800);
      } else {
        sharedAuth.setMascotState("error");
        toast.error(result.error || t("auth.register_failed") || "Registration failed");
        setTimeout(() => sharedAuth.setMascotState("idle"), 1000);
      }
    } catch (err: any) {
      sharedAuth.setMascotState("error");
      toast.error(err.message || t("auth.register_failed") || "Registration failed");
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
        isRegister={true}
      />
    </AuthLayout>
  );
};

export default RegisterPage;
