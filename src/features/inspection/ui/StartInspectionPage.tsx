import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "@iconify/react";
import { useEquipmentList } from "../../equipment/api";
import { useProductList } from "../../products/api";
import { PROCESS_OPTIONS, processLabel } from "../../products/lib/processLabels";
import type { InspectionProcess } from "../type/types";

// 제품 → 설비 → 시점(slots) 흐름으로 검사를 시작한다. 검사 지시 사전 등록과 무관.
// 시점 선택은 기존 ScanPage 재사용 — 마지막 단계에서 productId/equipmentId/process 를
// state 로 넘기며 navigate. POST /inspection 호출은 ScanPage 가 담당한다.

type Step = "product" | "equipment";

type ProcessFilter = "ALL" | InspectionProcess;

const PROCESS_FILTER_CHIPS: { value: ProcessFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  ...PROCESS_OPTIONS.map((o) => ({
    value: o.value as ProcessFilter,
    label: o.label,
  })),
];

interface SelectedProduct {
  id: number;
  name: string;
  code: string;
  process: string;
  customerName: string;
}

interface SelectedEquipment {
  id: number;
  name: string;
}

export default function StartInspectionPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // 단계 전환을 브라우저 history 에 쌓기 위해 step 을 URL 쿼리(?step=) 로 관리.
  // 설비 단계에서 뒤로가기를 누르면 자연스럽게 제품 단계로 복귀한다.
  // 제품이 아직 선택되지 않았으면 강제로 제품 단계로 폴백 (직접 URL 접근/새로고침 대비).
  const stepFromUrl = new URLSearchParams(location.search).get("step");
  const [product, setProduct] = useState<SelectedProduct | null>(null);
  const [equipment, setEquipment] = useState<SelectedEquipment | null>(null);
  const [productKeyword, setProductKeyword] = useState("");
  const [productProcess, setProductProcess] = useState<ProcessFilter>("ALL");
  const [equipmentKeyword, setEquipmentKeyword] = useState("");
  const step: Step =
    stepFromUrl === "equipment" && product ? "equipment" : "product";

  // 제품 단계로 (뒤로) 돌아왔을 때 선택했던 설비/검색어를 비워서, 다시 선택하면
  // 새 흐름처럼 보이도록 한다.
  useEffect(() => {
    if (step === "product") {
      setEquipment(null);
      setEquipmentKeyword("");
    }
  }, [step]);

  const productsQuery = useProductList();
  const equipmentQuery = useEquipmentList();

  const filteredProducts = useMemo(() => {
    const products = productsQuery.data ?? [];
    const kw = productKeyword.trim().toLowerCase();
    return products
      .filter((p) => p.isActive)
      .filter((p) => productProcess === "ALL" || p.process === productProcess)
      .filter((p) => {
        if (!kw) return true;
        return (
          p.name.toLowerCase().includes(kw) ||
          p.code.toLowerCase().includes(kw) ||
          p.customer.name.toLowerCase().includes(kw)
        );
      });
  }, [productsQuery.data, productKeyword, productProcess]);

  // 설비는 선택한 제품의 공정과 동일한 것만 노출. 다른 공정 설비를 선택하면
  // 백엔드에서 INVALID_INSPECTION_TYPE 이 떨어질 수 있어 사전 차단.
  const filteredEquipment = useMemo(() => {
    if (!product) return [];
    const equipmentList = equipmentQuery.data ?? [];
    const kw = equipmentKeyword.trim().toLowerCase();
    return equipmentList
      .filter((e) => e.process === product.process)
      .filter((e) => {
        if (!kw) return true;
        return e.name.toLowerCase().includes(kw);
      });
  }, [equipmentQuery.data, product, equipmentKeyword]);

  const handleSelectProduct = (p: SelectedProduct) => {
    setProduct(p);
    setEquipment(null);
    setEquipmentKeyword("");
    // URL 에 ?step=equipment 를 push — 브라우저 history 가 한 칸 늘어난다.
    navigate("?step=equipment");
  };

  const handleSelectEquipment = (e: SelectedEquipment) => {
    if (!product) return;
    setEquipment(e);
    // 시점 선택은 기존 ScanPage 가 담당 — productId/equipmentId/process 를 함께 전달.
    navigate("/scan", {
      state: {
        productId: product.id,
        equipmentId: e.id,
        process: product.process as InspectionProcess,
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F5F5F5] pb-20 md:pb-6">
      {/* StepBar + 선택된 제품 미리보기 + 검색/필터를 하나의 sticky 영역으로 묶음.
          Layout 의 <main overflow-y-auto> 안에서 top:0 으로 고정되어, 리스트만 스크롤된다.
          모바일(pb-20)에선 하단 TabBar(h-16)만큼, 데스크탑(md:pb-6)에선 TabBar 없으므로 작게. */}
      <div className="sticky top-0 z-10 bg-[#F5F5F5] px-4 pt-4 pb-3">
        <StepBar
          step={step}
          onJumpTo={(target) => {
            // history 일관성을 위해 직접 setState 가 아닌 뒤로가기로 처리한다.
            if (target === "product") navigate(-1);
          }}
        />
        {step === "equipment" && product && (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
            <div className="text-[#6B7280]">선택한 제품</div>
            <div className="mt-0.5 wrap-break-word text-sm font-medium text-[#212121]">
              {product.name}{" "}
              <span className="text-[#6B7280]">({product.code})</span>
            </div>
            <div className="mt-0.5 text-[11px] text-[#6B7280]">
              {processLabel(product.process)} · {product.customerName}
            </div>
          </div>
        )}
        <div className="mt-3">
          {step === "product" ? (
            <>
              <SearchBox
                value={productKeyword}
                onChange={setProductKeyword}
                placeholder="제품명 / 코드 / 고객사 검색"
              />
              <ProcessChipFilter
                value={productProcess}
                onChange={setProductProcess}
              />
            </>
          ) : (
            <SearchBox
              value={equipmentKeyword}
              onChange={setEquipmentKeyword}
              placeholder="설비명 검색"
            />
          )}
        </div>
      </div>

      <main className="flex-1 px-4 pt-4">
        {step === "product" ? (
          <>
            {productsQuery.isLoading ? (
              <EmptyMsg>제품을 불러오는 중...</EmptyMsg>
            ) : productsQuery.isError ? (
              <EmptyMsg error>제품 목록을 불러오지 못했습니다.</EmptyMsg>
            ) : filteredProducts.length === 0 ? (
              <EmptyMsg>
                {productProcess === "ALL"
                  ? "일치하는 제품이 없습니다."
                  : "해당 공정의 제품이 없습니다."}
              </EmptyMsg>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {filteredProducts.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectProduct({
                          id: p.id,
                          name: p.name,
                          code: p.code,
                          process: p.process,
                          customerName: p.customer.name,
                        })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50"
                    >
                      <div className="min-w-0">
                        <div className="wrap-break-word text-sm font-semibold text-[#212121]">
                          {p.name}
                        </div>
                        <div className="mt-0.5 truncate text-xs text-[#6B7280]">
                          {p.code} · {p.customer.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#931B82]">
                          {processLabel(p.process)}
                        </div>
                      </div>
                      <Icon
                        icon="solar:arrow-right-linear"
                        width={18}
                        height={18}
                        className="shrink-0 text-[#9CA3AF]"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            {equipmentQuery.isLoading ? (
              <EmptyMsg>설비를 불러오는 중...</EmptyMsg>
            ) : equipmentQuery.isError ? (
              <EmptyMsg error>설비 목록을 불러오지 못했습니다.</EmptyMsg>
            ) : filteredEquipment.length === 0 ? (
              <EmptyMsg>
                선택한 공정({processLabel(product?.process ?? "")})에 사용할 수
                있는 설비가 없습니다.
              </EmptyMsg>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {filteredEquipment.map((e) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() =>
                        handleSelectEquipment({ id: e.id, name: e.name })
                      }
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3 text-left shadow-sm transition-colors hover:bg-gray-50"
                      aria-pressed={equipment?.id === e.id}
                    >
                      <div className="min-w-0">
                        <div className="wrap-break-word text-sm font-semibold text-[#212121]">
                          {e.name}
                        </div>
                        <div className="mt-0.5 text-[11px] text-[#931B82]">
                          {processLabel(e.process)}
                        </div>
                      </div>
                      <Icon
                        icon="solar:arrow-right-linear"
                        width={18}
                        height={18}
                        className="shrink-0 text-[#9CA3AF]"
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

    </div>
  );
}

function StepBar({
  step,
  onJumpTo,
}: {
  step: Step;
  onJumpTo?: (target: Step) => void;
}) {
  const items: { key: Step | "slot"; label: string }[] = [
    { key: "product", label: "제품" },
    { key: "equipment", label: "설비" },
    { key: "slot", label: "시점" },
  ];
  const activeIndex = items.findIndex((it) => it.key === step);

  return (
    <ol className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-medium text-[#6B7280] shadow-sm">
      {items.map((it, idx) => {
        const done = idx < activeIndex;
        const active = idx === activeIndex;
        const clickable =
          done && it.key !== "slot" && typeof onJumpTo === "function";

        const indexBadge = (
          <span
            className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold ${
              done
                ? "bg-[#931B82] text-white"
                : active
                  ? "bg-[#F3E8FF] text-[#931B82]"
                  : "bg-[#F3F4F6] text-[#9CA3AF]"
            }`}
          >
            {idx + 1}
          </span>
        );
        const labelEl = (
          <span
            className={
              active
                ? "text-[#931B82]"
                : done
                  ? "text-[#212121]"
                  : "text-[#9CA3AF]"
            }
          >
            {it.label}
          </span>
        );

        return (
          <li key={it.key} className="flex items-center gap-2">
            {clickable ? (
              <button
                type="button"
                onClick={() => onJumpTo?.(it.key as Step)}
                className="flex items-center gap-1.5 rounded-md hover:bg-black/5"
              >
                {indexBadge}
                {labelEl}
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                {indexBadge}
                {labelEl}
              </div>
            )}
            {idx < items.length - 1 && (
              <span className="text-[#D1D5DB]">›</span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function ProcessChipFilter({
  value,
  onChange,
}: {
  value: ProcessFilter;
  onChange: (v: ProcessFilter) => void;
}) {
  return (
    <div className="-mx-4 mt-3 overflow-x-auto px-4">
      <div
        role="radiogroup"
        aria-label="공정 필터"
        className="flex w-max items-center gap-2"
      >
        {PROCESS_FILTER_CHIPS.map((chip) => {
          const selected = chip.value === value;
          return (
            <button
              key={chip.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(chip.value)}
              className={`h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors ${
                selected
                  ? "border-[#931B82] bg-[#931B82] text-white"
                  : "border-gray-300 bg-white text-[#6B7280] hover:bg-gray-50"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Icon
        icon="solar:magnifer-linear"
        width={18}
        height={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-md border border-gray-300 bg-white pl-9 pr-3 text-sm text-[#212121] placeholder:text-[#9CA3AF] focus:border-[#931B82] focus:outline-none focus:ring-1 focus:ring-[#931B82]"
      />
    </div>
  );
}

function EmptyMsg({
  children,
  error,
}: {
  children: React.ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={`mt-6 rounded-lg border border-dashed border-gray-300 bg-white py-8 text-center text-xs ${error ? "text-[#EF4444]" : "text-[#A8A8A8]"}`}
    >
      {children}
    </div>
  );
}
