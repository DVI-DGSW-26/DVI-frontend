import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import { signup, AuthError, type SignupRole } from "../api";
import SignupFormWeb from "./SignupForm.web";
import SignupFormMobile from "./SignupForm.mobile";

export interface SignupFormProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  name: string;
  setName: (value: string) => void;
  department: string;
  setDepartment: (value: string) => void;
  onSubmit: () => void;
}

export default function Signup() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");

  const { t } = useTranslation("auth");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (password !== confirmPassword) {
      alert(t("signup.passwordMismatch"));
      return;
    }
    if (department !== "PRODUCTION" && department !== "QUALITY") {
      alert(t("signup.selectDepartment"));
      return;
    }

    const payload = {
      loginId: username,
      password,
      name,
      role: department as SignupRole,
    };

    try {
      await signup(payload);
      alert(t("signup.approvalRequested"));
      navigate("/login");
    } catch (err) {
      console.error("signup failed", { payload, err });
      if (err instanceof AuthError) {
        alert(err.message);
      } else {
        alert(t("signup.error"));
      }
    }
  };

  const props: SignupFormProps = {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    name,
    setName,
    department,
    setDepartment,
    onSubmit: handleSubmit,
  };

  return isMobile ? <SignupFormMobile {...props} /> : <SignupFormWeb {...props} />;
}
