import authBackground from "../../../assets/authBackground.png";
import authLogo from "../../../assets/authLogo.svg";
import Logo from "../../../assets/Logo.svg";
import Select from "react-select";
import Button from "../../../components/Button";
import type { SignupFormProps } from "./SignupForm";

const departmentOptions = [
  { value: "dev", label: "개발팀" },
  { value: "design", label: "디자인팀" },
  { value: "marketing", label: "마케팅팀" },
];

const selectStyles = {
  control: (base: any) => ({
    ...base,
    height: "60px",
    borderColor: "#A8A8A8",
    borderRadius: "6px",
    paddingLeft: "5px",
    boxShadow: "none",
    "&:hover": { borderColor: "#A8A8A8" },
  }),
  dropdownIndicator: (base: any) => ({
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
    <div className="flex h-screen w-full">
      {/* 왼쪽 고정 이미지 */}
      <div className="fixed left-0 top-0 w-1/2 h-screen overflow-hidden">
        <img src={authBackground} className="w-full h-full object-cover" />
        <img src={authLogo} className="absolute top-10 left-8 w-44" />
        <div className="absolute inset-0 flex flex-col justify-center left-12 gap-6">
          <span className="text-[66px] font-bold text-white leading-23">
            Built Locally,
            <br />
            Delivered Globally
          </span>
          <span className="text-[24px] font-medium text-white">
            설계부터 생산, 수출까지 신뢰를 바탕으로 완성한 <br />
            알루미늄 솔루션을 전 세계에 전달합니다.
          </span>
        </div>
      </div>

      {/* 오른쪽 스크롤 영역 */}
      <div className="fixed right-0 top-0 w-1/2 h-screen bg-white flex flex-col items-center justify-center">
        <div className="flex flex-col w-160">
          <div
            className="flex flex-col items-center gap-2"
            style={{ marginBottom: "60px" }}
          >
            <img src={Logo} className="w-90" />
          </div>
          <div className="flex flex-col gap-3">
            <input
              placeholder="아이디를 입력하세요."
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 입력하세요."
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 재입력하세요."
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <div className="flex gap-4">
              <input
                placeholder="이름을 입력하세요."
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: "13px" }}
                className="w-1/2 border border-[#A8A8A8] rounded-lg h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
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
