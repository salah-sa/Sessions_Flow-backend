import { UseFormRegister, FieldErrors, UseFormSetValue, UseFormWatch } from "react-hook-form";

export type MascotState = "idle" | "watching" | "password" | "success" | "error" | "thinking";
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
  onSocialLogin?: (provider: string) => void;
}

export interface LoginStyleProps extends SharedAuthProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue?: UseFormSetValue<any>;
  watch?: UseFormWatch<any>;
  isRegister?: boolean;
  discoveryStep?: 'search' | 'pick-student' | 'register';
  discoveredGroup?: {
    groupName: string;
    engineerName: string;
    level: number;
    students: { id: string; name: string }[];
    suggestions?: string[];
  } | null;
  onDiscover?: (groupName: string) => Promise<void>;
  selectedStudent?: { id: string; name: string } | null;
  onSelectStudent?: (student: { id: string; name: string }) => void;
  onResetDiscovery?: () => void;
}

export interface RegisterStyleProps extends SharedAuthProps {
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  onSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  setValue?: UseFormSetValue<any>;
}
