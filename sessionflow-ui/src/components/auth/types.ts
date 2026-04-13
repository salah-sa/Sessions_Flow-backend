import { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";

export type MascotState = "idle" | "watching" | "password" | "success" | "error";
export type AuthMode = "engineer" | "student";

export interface SharedAuthProps {
  loginMode: AuthMode;
  setLoginMode: (mode: AuthMode) => void;
  loading: boolean;
  mascotState: MascotState;
  passwordStrength: number;
  rememberMe: boolean;
  setRememberMe: (val: boolean) => void;
  handleFieldFocus: (type: string) => void;
  handleFieldBlur: () => void;
  handlePasswordChange: (e: any) => void;
  onNavigate: (path: string) => void;
}

export interface LoginStyleProps extends SharedAuthProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue?: UseFormSetValue<any>;
  isRegister?: boolean;
}

export interface RegisterStyleProps extends SharedAuthProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue?: UseFormSetValue<any>;
}
