import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { registerEngineer, registerStudentQueue } from "../api/authService";
import { authApi } from "../api/resources";
import { useTranslation } from "react-i18next";
import { useSharedAuth } from "../hooks/useSharedAuth";
import { AuthLayout } from "../components/auth/AuthLayout";
import { StyleGradientAnimated } from "../components/auth/styles/StyleGradientAnimated";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  identifier: z.string().min(3, "Must be at least 3 characters"),
  email: z.string().email("Invalid email").optional(),
  password: z.string().min(6, "Must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Must be at least 6 characters"),
  groupName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  const sharedAuth = useSharedAuth();
  
  const { register, handleSubmit, formState: { errors }, watch, resetField, setValue } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const [discoveryStep, setDiscoveryStep] = useState<'search' | 'pick-student' | 'register'>('search');
  const [discoveredGroup, setDiscoveredGroup] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string } | null>(null);

  const groupName = watch("groupName");

  const onDiscover = async (manualName?: string) => {
    const targetName = manualName || groupName;
    if (!targetName) {
      toast.error("Please enter a group name");
      return;
    }
    setLoading(true);
    try {
      const result = await authApi.discoverGroup(targetName);
      
      if (result.groupName) {
        // Exact match found
        setDiscoveredGroup(result);
        setDiscoveryStep('pick-student');
        sharedAuth.setMascotState("watching");
        toast.success("Group found! Please select your name.");
      } else if (result.suggestions && result.suggestions.length > 0) {
        // No exact match but we have suggestions
        setDiscoveredGroup(result);
        sharedAuth.setMascotState("thinking");
        toast.info("Group not found exactly. Did you mean one of these?");
      } else {
        // Nothing found at all
        toast.error("Group not found. Please check the name and try again.");
        sharedAuth.setMascotState("error");
        setTimeout(() => sharedAuth.setMascotState("idle"), 2000);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to search. Please try again.");
      sharedAuth.setMascotState("error");
      setTimeout(() => sharedAuth.setMascotState("idle"), 1000);
    } finally {
      setLoading(false);
    }
  };

  const onSelectStudent = (student: { id: string; name: string; status?: string }) => {
    if (student.status === "Registered") {
      toast.error("You need to sign in. Admin approved your account, go sign in.");
      setTimeout(() => sharedAuth.onNavigate("/login"), 2000);
      return;
    }
    setSelectedStudent(student);
    setValue("name", student.name);
    setDiscoveryStep('register');
    sharedAuth.setMascotState("success");
    setTimeout(() => sharedAuth.setMascotState("idle"), 500);
  };

  const onResetDiscovery = () => {
    setDiscoveryStep('search');
    setDiscoveredGroup(null);
    setSelectedStudent(null);
    resetField("groupName");
    resetField("name");
  };

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
        if (!data.groupName || !data.email || !selectedStudent) {
          toast.error("Group Selection and Email are required");
          setLoading(false);
          return;
        }
        result = await registerStudentQueue(
          data.name,
          data.identifier,
          data.email,
          data.password,
          data.groupName,
          selectedStudent.id
        );
      }

      if (result.success) {
        sharedAuth.setMascotState("success");
        toast.success(sharedAuth.loginMode === "engineer" 
          ? "Registration submitted. Awaiting approval." 
          : "Request sent to engineer. You will receive an email upon approval.");
        setTimeout(() => sharedAuth.onNavigate("/login"), 1500);
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
        discoveryStep={discoveryStep}
        discoveredGroup={discoveredGroup}
        onDiscover={onDiscover}
        selectedStudent={selectedStudent}
        onSelectStudent={onSelectStudent}
        onResetDiscovery={onResetDiscovery}
        watch={watch}
      />

    </AuthLayout>
  );
};

export default RegisterPage;
