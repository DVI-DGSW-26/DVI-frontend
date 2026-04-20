import { useState } from "react";
import { useMediaQuery } from "../../../hooks/useMediaQuery";
import LoginFormWeb from "./LoginForm.web";
import LoginFormMobile from "./LoginForm.mobile";

export interface LoginFormProps {
  username: string;
  setUsername: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  onSubmit: () => void;
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isMobile = useMediaQuery("(max-width: 767px)");

  const handleSubmit = () => {
    // TODO: API 호출
  };

  const props: LoginFormProps = {
    username,
    setUsername,
    password,
    setPassword,
    onSubmit: handleSubmit,
  };

  return isMobile ? <LoginFormMobile /> : <LoginFormWeb {...props} />;
}
