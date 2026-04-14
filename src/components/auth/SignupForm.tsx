import authBackground from "../../assets/authBackground.png";
import authLogo from "../../assets/authLogo.svg";
import Logo from "../../assets/Logo1.svg";
import Select from "react-select";

const departmentOptions = [
  { value: "dev", label: "개발팀" },
  { value: "design", label: "디자인팀" },
  { value: "marketing", label: "마케팅팀" },
];

const positionOptions = [
  { value: "staff", label: "사원" },
  { value: "senior", label: "대리" },
  { value: "manager", label: "과장" },
  { value: "director", label: "부장" },
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

export default function Signup() {
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
          <div className="flex flex-col items-center gap-2" style={{ marginBottom: "60px" }}>
            <img src={Logo} className="w-90" />
            <span className="text-[#931B82] font-medium text-[22px]">
              정밀 생산으로 완성되는 기술력
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <input
              placeholder="아이디를 입력하세요."
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-md h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 입력하세요."
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-md h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="비밀번호를 재입력하세요."
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-md h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <input
              placeholder="이름을 입력하세요."
              style={{ paddingLeft: "13px" }}
              className="w-full border border-[#A8A8A8] rounded-md h-15 focus:outline-none focus:ring-1 focus:ring-[#931B82]"
            />
            <div className="flex gap-4">
              <div className="w-1/2">
                <Select
                  placeholder="부서를 선택하세요."
                  options={departmentOptions}
                  styles={selectStyles}
                />
              </div>
              <div className="w-1/2">
                <Select
                  placeholder="직급을 선택하세요."
                  options={positionOptions}
                  styles={selectStyles}
                />
              </div>
            </div>
            <button
              style={{ marginTop: "30px" }}
              className="w-full bg-[#931B82] text-white rounded-md h-15 hover:bg-[#7A1565] transition-colors"
            >
              회원가입
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}