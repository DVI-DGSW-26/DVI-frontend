import { useState } from "react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
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

  const isMobile = useMediaQuery("(max-width: 767px)");

  const handleSubmit = () => {
    // TODO: API 호출
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

  return isMobile ? <SignupFormMobile /> : <SignupFormWeb {...props} />;
}
