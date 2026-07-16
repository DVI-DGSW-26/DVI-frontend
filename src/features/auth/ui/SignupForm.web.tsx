import authBackground from "../../../assets/authBackground.png";
import authLogo from "../../../assets/authLogo.svg";
import Logo from "../../../assets/Logo.svg";
import Select, { type StylesConfig } from "react-select";
import Button from "../../../components/shared/Button";
import type { SignupFormProps } from "./SignupForm";

const departmentOptions = [
  { value: "PRODUCTION", label: "생산" },
  { value: "QUALITY", label: "품질" },
];

const selectStyles: StylesConfig = {
  control: (base) => ({
    ...base,
    height: "48px",
    minHeight: "48px",
    "@media (min-width: 1280px)": {
      height: "60px",
      minHeight: "60px",
    },
    borderColor: "#A8A8A8",
    borderRadius: "6px",
    paddingLeft: "5px",
    boxShadow: "none",
    "&:hover": { borderColor: "#A8A8A8" },
  }),
  dropdownIndicator: (base) => ({
    ...base,
    paddingRight: "12px",
  }),
  indicatorSeparator: () => ({
    display: "none",
  }),
};

export default function SignupFormWeb({
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
  onSubmit,
}: SignupFormProps) {
  return (
    <div className="flex h-dvh w-full">
      {/* 왼쪽 고정 이미지 */}
      <div className="fixed left-0 top-0 w-1/2 h-dvh overflow-hidden lg:block hidden">
        <img src={authBackground} className="w-full h-full object-cover" />
        <img src={authLogo} className="absolute top-10 left-8 w-44" />
        <div className="absolute inset-0 flex flex-col justify-center left-12 gap-6">
          <div className="flex flex-col gap-0 leading-tight">
            <span className="text-[40px] xl:text-[46px] text-white font-semibold">A social enterprise that cares about </span>
            <span className="text-[58px] xl:text-[64px] text-white font-black leading-tight">people, technology, and<br/>the environment</span>
          </div>
          <span className="text-[18px] xl:text-[24px] font-medium text-white">
            사람, 기술, 환경을 중시하는 사회적 기업
          </span>
        </div>
      </div>

      {/* 오른쪽 스크롤 영역 */}
      <div className="fixed right-0 top-0 w-full lg:w-1/2 h-dvh bg-white flex flex-col items-center justify-center">
        <div className="flex flex-col w-full max-w-md px-6 lg:px-0 xl:max-w-xl 2xl:max-w-2xl">
          <div
            className="flex flex-col items-center gap-2"
            style={{ marginBottom: "60px" }}
          >
            <img src={Logo} className="w-60 xl:w-90" />
          </div>
          <div className="flex flex-col gap-3">
            <input
              placeholder="아이디를 입력하세요."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 입력하세요."
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 재입력하세요."
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <div className="flex gap-4">
              <input
                placeholder="이름을 입력하세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: "13px" }}
                className="w-1/2 border border-[#A8A8A8] rounded-lg h-12 xl:h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
              />
              <div className="w-1/2">
                <Select
                  placeholder="부서를 선택하세요."
                  options={departmentOptions}
                  value={departmentOptions.find((o) => o.value === department)}
                  onChange={(selected) => setDepartment(selected?.value ?? "")}
                  styles={selectStyles}
                />
              </div>
            </div>
            <div style={{ marginTop: "35px" }}>
              <Button onClick={onSubmit}>회원가입</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
