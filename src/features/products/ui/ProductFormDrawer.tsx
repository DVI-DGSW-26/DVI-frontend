import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import {
  useCreateProduct,
  useProductDetail,
  useUpdateProduct,
} from "../api";
import type {
  CreateProductRequest,
  ProcessType,
  ProductDimInput,
  ProductListItem,
} from "../api";
import { PROCESS_OPTIONS } from "../lib/processLabels";

interface Props {
  open: boolean;
  onClose: () => void;
  product?: ProductListItem | null;
  customerOptions: { id: number; name: string }[];
}

interface DimDraft {
  dimName: string;
  standardValue: string;
  tolerancePlus: string;
  toleranceMinus: string;
}

const MAX_DIMS = 7;

function emptyDim(): DimDraft {
  return { dimName: "", standardValue: "", tolerancePlus: "", toleranceMinus: "" };
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function ProductFormDrawer({
  open,
  onClose,
  product,
  customerOptions,
}: Props) {
  const isEdit = !!product;
  const productId = product?.id ?? null;

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [customerId, setCustomerId] = useState<number | "">("");
  const [customerIdManual, setCustomerIdManual] = useState("");
  const [process, setProcess] = useState<ProcessType | "">("");
  const [sketchUrl, setSketchUrl] = useState("");
  const [dims, setDims] = useState<DimDraft[]>([emptyDim()]);
  const [error, setError] = useState<string | null>(null);

  const {
    data: detail,
    isLoading: loadingDetail,
    isError: detailError,
  } = useProductDetail(open && isEdit ? productId : null);

  const { mutate: create, isPending: isCreating } = useCreateProduct();
  const { mutate: update, isPending: isUpdating } = useUpdateProduct();
  const isPending = isCreating || isUpdating;

  const customerInOptions = useMemo(
    () =>
      customerId !== "" &&
      customerOptions.some((c) => c.id === customerId),
    [customerId, customerOptions],
  );

  useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setName("");
      setCode("");
      setCustomerId("");
      setCustomerIdManual("");
      setProcess("");
      setSketchUrl("");
      setDims([emptyDim()]);
      setError(null);
      return;
    }
    if (detail) {
      setName(detail.name);
      setCode(detail.code);
      setCustomerId(detail.customer.id);
      setCustomerIdManual(String(detail.customer.id));
      setProcess((detail.process as ProcessType) || "");
      setSketchUrl(detail.sketchUrl ?? "");
      setDims(
        detail.dims.length > 0
          ? detail.dims
              .slice()
              .sort((a, b) => a.dimNo - b.dimNo)
              .map((d) => ({
                dimName: d.dimName ?? "",
                standardValue: String(d.standardValue ?? ""),
                tolerancePlus: String(d.tolerancePlus ?? ""),
                toleranceMinus: String(d.toleranceMinus ?? ""),
              }))
          : [emptyDim()],
      );
      setError(null);
    }
  }, [open, isEdit, detail]);

  const addDim = () => {
    if (dims.length >= MAX_DIMS) return;
    setDims((prev) => [...prev, emptyDim()]);
  };

  const removeDim = (idx: number) => {
    setDims((prev) =>
      prev.length === 1 ? [emptyDim()] : prev.filter((_, i) => i !== idx),
    );
  };

  const updateDim = (idx: number, patch: Partial<DimDraft>) => {
    setDims((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...patch } : d)),
    );
  };

  const resolvedCustomerId = useMemo(() => {
    if (customerId !== "") return customerId;
    const manual = toNumber(customerIdManual);
    return manual !== null && manual > 0 ? manual : null;
  }, [customerId, customerIdManual]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) return setError("제품명을 입력하세요.");
    if (!code.trim()) return setError("제품 코드를 입력하세요.");
    if (resolvedCustomerId === null)
      return setError("고객사를 선택하거나 ID를 입력하세요.");
    if (!process) return setError("공정을 선택하세요.");

    const dimsInput: ProductDimInput[] = [];
    for (let i = 0; i < dims.length; i += 1) {
      const d = dims[i];
      const isEmpty =
        d.dimName.trim() === "" &&
        d.standardValue === "" &&
        d.tolerancePlus === "" &&
        d.toleranceMinus === "";
      if (isEmpty) continue;

      if (!d.dimName.trim())
        return setError(`치수 ${i + 1}: 항목명을 입력하세요.`);
      const std = toNumber(d.standardValue);
      const plus = toNumber(d.tolerancePlus);
      const minus = toNumber(d.toleranceMinus);
      if (std === null)
        return setError(`치수 ${i + 1}: 기준값을 입력하세요.`);
      if (plus === null)
        return setError(`치수 ${i + 1}: 공차(+)를 입력하세요.`);
      if (minus === null)
        return setError(`치수 ${i + 1}: 공차(-)를 입력하세요.`);

      dimsInput.push({
        dimNo: i + 1,
        dimName: d.dimName.trim(),
        standardValue: std,
        tolerancePlus: plus,
        toleranceMinus: minus,
      });
    }

    if (dimsInput.length === 0)
      return setError("치수항목을 최소 1개 이상 입력하세요.");
    if (dimsInput.length > MAX_DIMS)
      return setError(`치수항목은 최대 ${MAX_DIMS}개까지 등록 가능합니다.`);

    const body: CreateProductRequest = {
      customerId: resolvedCustomerId,
      name: name.trim(),
      code: code.trim(),
      process: process as ProcessType,
      sketchUrl: sketchUrl.trim() === "" ? null : sketchUrl.trim(),
      dims: dimsInput,
    };

    const handlers = {
      onSuccess: () => onClose(),
      onError: () => {
        setError(
          isEdit
            ? "제품 수정 중 오류가 발생했습니다."
            : "제품 등록 중 오류가 발생했습니다.",
        );
      },
    };

    if (isEdit && product) {
      update({ productId: product.id, body }, handlers);
    } else {
      create(body, handlers);
    }
  };

  const title = isEdit ? "제품 수정" : "제품 등록";
  const submitLabel = isEdit
    ? isPending
      ? "수정 중..."
      : "수정"
    : isPending
      ? "등록 중..."
      : "등록";

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <h2 className="text-base font-semibold text-[#212121]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="text-[#A8A8A8] transition-colors hover:text-[#212121]"
          >
            <Icon icon="mdi:close" width={22} height={22} />
          </button>
        </header>

        {isEdit && loadingDetail ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#A8A8A8]">
            불러오는 중...
          </div>
        ) : isEdit && detailError ? (
          <div className="flex flex-1 items-center justify-center text-sm text-[#EF4444]">
            제품 정보를 불러오지 못했습니다.
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5"
          >
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[#212121]">제품명</span>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="DV-A0100"
                  className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-[#212121]">제품 코드</span>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="DV-A0100"
                  className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
                />
              </label>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">고객사</span>
              {customerOptions.length > 0 ? (
                <select
                  value={customerId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCustomerId(v === "" ? "" : Number(v));
                    setCustomerIdManual(v);
                  }}
                  className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
                >
                  <option value="">고객사를 선택하세요</option>
                  {customerOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (#{c.id})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={1}
                  value={customerIdManual}
                  onChange={(e) => {
                    setCustomerIdManual(e.target.value);
                    setCustomerId("");
                  }}
                  placeholder="고객사 ID"
                  className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
                />
              )}
              {customerOptions.length > 0 && customerId !== "" && !customerInOptions && (
                <span className="text-xs text-[#6B7280]">
                  선택된 고객사 ID: {customerId}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">공정</span>
              <select
                value={process}
                onChange={(e) => setProcess(e.target.value as ProcessType | "")}
                className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
              >
                <option value="">공정을 선택하세요</option>
                {PROCESS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">
                스케치 URL <span className="text-xs text-[#A8A8A8]">(선택)</span>
              </span>
              <input
                type="url"
                value={sketchUrl}
                onChange={(e) => setSketchUrl(e.target.value)}
                placeholder="https://example.com/sketches/DV-A0100.png"
                className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
              />
            </label>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#212121]">
                  치수항목{" "}
                  <span className="text-xs text-[#6B7280]">
                    ({dims.length}/{MAX_DIMS})
                  </span>
                </span>
                <button
                  type="button"
                  onClick={addDim}
                  disabled={dims.length >= MAX_DIMS}
                  className="flex items-center gap-1 rounded-md border border-[#931B82] px-2 py-1 text-xs font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Icon icon="mdi:plus" width={14} height={14} />
                  추가
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {dims.map((d, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-lg border border-gray-200 bg-[#FAFAFA] p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[#6B7280]">
                        치수 #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeDim(idx)}
                        aria-label="삭제"
                        className="text-[#A8A8A8] transition-colors hover:text-[#EF4444]"
                      >
                        <Icon icon="mdi:close" width={16} height={16} />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={d.dimName}
                      onChange={(e) => updateDim(idx, { dimName: e.target.value })}
                      placeholder="항목명 (예: 바깥지름)"
                      className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <DimNumberInput
                        label="기준"
                        value={d.standardValue}
                        onChange={(v) => updateDim(idx, { standardValue: v })}
                      />
                      <DimNumberInput
                        label="공차 +"
                        value={d.tolerancePlus}
                        onChange={(v) => updateDim(idx, { tolerancePlus: v })}
                      />
                      <DimNumberInput
                        label="공차 -"
                        value={d.toleranceMinus}
                        onChange={(v) => updateDim(idx, { toleranceMinus: v })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            <div className="mt-auto flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitLabel}
              </button>
            </div>
          </form>
        )}
      </aside>
    </>
  );
}

interface DimNumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function DimNumberInput({ label, value, onChange }: DimNumberInputProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#6B7280]">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-[#931B82] focus:outline-none"
      />
    </label>
  );
}
