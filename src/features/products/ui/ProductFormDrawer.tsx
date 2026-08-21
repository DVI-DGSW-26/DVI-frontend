import { useEffect, useMemo, useRef, useState } from "react";
import { AxiosError } from "axios";
import { Icon } from "@iconify/react";
import {
  useCreateProduct,
  useProductDetail,
  useUpdateProduct,
  useUploadProductSketch,
} from "../api";
import type {
  CreateProductRequest,
  ProcessType,
  ProductDimInput,
  ProductListItem,
  ProductValueType,
} from "../api";
import { useProcessOptions } from "../../process";
import { toBackendImageUrl } from "../../../lib/imageUrl";
import {
  isAllowedImageFile,
  MAX_UPLOAD_BYTES,
} from "../../../lib/uploadImage";

interface Props {
  open: boolean;
  onClose: () => void;
  product?: ProductListItem | null;
  customerOptions: { id: number; name: string }[];
}

interface DimDraft {
  // 서버에서 불러온 기존 dim 의 id. 신규 추가 항목은 undefined.
  // 저장 시 id 를 함께 보내 백엔드가 in-place 수정하도록 한다(사용 중 제품도 값 수정 가능).
  id?: number;
  dimName: string;
  // PASS_FAIL 항목은 숫자값이 의미 없지만 폼 상태는 동일하게 string 유지 (입력 안 함).
  standardValue: string;
  // 부호 포함 편차(도면 표기 그대로). 상한이 음수인 단측 공차도 있다.
  toleranceUpper: string;
  toleranceLower: string;
  // 하한을 사용자가 직접 입력했는지. false 인 동안에는 상한을 넣을 때
  // 하한을 -상한으로 자동으로 채운다(대칭 공차가 대부분이라).
  lowerEdited?: boolean;
  valueType: ProductValueType;
}

const MAX_DIMS = 10;

function emptyDim(): DimDraft {
  return {
    dimName: "",
    standardValue: "",
    toleranceUpper: "",
    toleranceLower: "",
    valueType: "NUMBER",
  };
}

function emptyPassFail(): DimDraft {
  return {
    dimName: "",
    standardValue: "",
    toleranceUpper: "",
    toleranceLower: "",
    valueType: "PASS_FAIL",
  };
}

/**
 * 상한 공차 입력에 따른 갱신 내용.
 *
 * 현장 공차는 대부분 대칭(±)이라, 하한을 아직 직접 입력하지 않았으면 -상한으로
 * 채워준다. 단측 공차(예: 상한 -0.25 / 하한 -0.4)는 사용자가 하한을 고치는 순간
 * lowerEdited 가 서서 더 이상 자동으로 덮어쓰지 않는다.
 */
function upperPatch(dim: DimDraft, value: string): Partial<DimDraft> {
  if (dim.lowerEdited) return { toleranceUpper: value };
  const n = Number(value);
  if (value.trim() === "" || !Number.isFinite(n)) {
    return { toleranceUpper: value, toleranceLower: "" };
  }
  // -0 이 문자열로 새어나가지 않도록 0 은 그대로 둔다.
  return { toleranceUpper: value, toleranceLower: n === 0 ? "0" : String(-n) };
}

function toNumber(value: string): number | null {
  if (value.trim() === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// 스케치 미리보기 — 주소가 살아있지 않을 때(백엔드 주소 문제 등) 빈 사각형만
// 남지 않도록 안내를 띄운다. 부모에서 key={src} 로 새 URL 마다 상태를 초기화한다.
function SketchPreview({ src }: { src: string }) {
  const resolved = toBackendImageUrl(src) ?? "";
  const [failed, setFailed] = useState(resolved === "");

  return (
    <div className="relative h-28 w-36 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-[#F9FAFB]">
      {!failed && (
        <img
          src={resolved}
          alt="제품 스케치 미리보기"
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
        />
      )}
      {failed && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2 text-center">
          <Icon
            icon="solar:gallery-broken"
            width={22}
            height={22}
            className="text-[#D1D5DB]"
          />
          <span className="text-[11px] leading-tight text-[#9CA3AF]">
            이미지를 불러올 수 없습니다
          </span>
        </div>
      )}
    </div>
  );
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
  // 스케치는 파일을 업로드해 받은 URL 을 담아둔다 (payload 는 예전처럼 sketchUrl 문자열).
  const [sketchUrl, setSketchUrl] = useState("");
  const [sketchError, setSketchError] = useState<string | null>(null);
  const sketchInputRef = useRef<HTMLInputElement | null>(null);
  const [dims, setDims] = useState<DimDraft[]>([emptyDim()]);
  const [error, setError] = useState<string | null>(null);
  // 수정 모드에서 dims 가 변경됐는지 판단용. 백엔드가 PATCH 시 dims 를 통째로 교체하면서
  // 기존 dim 이 검사 결과에서 참조될 경우 409 RESOURCE_IN_USE 가 떨어지므로,
  // 사용자가 dims 를 안 건드렸으면 payload 에서 빼서 백엔드가 손대지 않도록 한다.
  const originalDimsKeyRef = useRef<string>("");

  const {
    data: detail,
    isLoading: loadingDetail,
    isError: detailError,
  } = useProductDetail(open && isEdit ? productId : null);

  // 수정 중인 값이 비활성 공정이어도 선택이 풀리지 않도록 옵션에 포함시킨다.
  const processOptions = useProcessOptions(process ? [process] : []);

  const { mutate: create, isPending: isCreating } = useCreateProduct();
  const { mutate: update, isPending: isUpdating } = useUpdateProduct();
  const { mutate: uploadSketch, isPending: isUploadingSketch } =
    useUploadProductSketch();
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
      setSketchError(null);
      setDims([emptyDim()]);
      setError(null);
      originalDimsKeyRef.current = "";
      return;
    }
    if (detail) {
      setName(detail.name);
      setCode(detail.code);
      setCustomerId(detail.customer.id);
      setCustomerIdManual(String(detail.customer.id));
      setProcess((detail.process as ProcessType) || "");
      setSketchUrl(detail.sketchUrl ?? "");
      setSketchError(null);
      const loadedDims: DimDraft[] =
        detail.dims.length > 0
          ? detail.dims
              .slice()
              .sort((a, b) => a.dimNo - b.dimNo)
              .map<DimDraft>((d) => ({
                id: d.id,
                dimName: d.dimName ?? "",
                standardValue: String(d.standardValue ?? ""),
                toleranceUpper: String(d.toleranceUpper ?? ""),
                toleranceLower: String(d.toleranceLower ?? ""),
                // 저장된 값이 있으므로 상한을 고쳐도 하한을 덮어쓰지 않는다.
                lowerEdited: true,
                valueType: d.valueType ?? "NUMBER",
              }))
          : [emptyDim()];
      setDims(loadedDims);
      originalDimsKeyRef.current = JSON.stringify(loadedDims);
      setError(null);
    }
  }, [open, isEdit, detail]);

  const pickSketch = () => sketchInputRef.current?.click();

  const handleSketchFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 발생하도록 값 비우기.
    e.target.value = "";
    if (!file) return;
    if (!isAllowedImageFile(file)) {
      setSketchError("PNG/JPG 이미지만 등록할 수 있습니다.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setSketchError("최대 10MB 이하의 이미지만 등록할 수 있습니다.");
      return;
    }
    setSketchError(null);
    // 저장 버튼과 무관하게 즉시 올리고, 받은 URL 을 sketchUrl 에 담아둔다.
    uploadSketch(file, {
      onSuccess: (url) => setSketchUrl(url),
      onError: () =>
        setSketchError("이미지 업로드에 실패했습니다. 다시 시도해주세요."),
    });
  };

  const addDim = () => {
    if (dims.length >= MAX_DIMS) return;
    setDims((prev) => [...prev, emptyDim()]);
  };

  const addPassFail = () => {
    if (dims.length >= MAX_DIMS) return;
    setDims((prev) => [...prev, emptyPassFail()]);
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
        d.toleranceUpper === "" &&
        d.toleranceLower === "";
      if (isEmpty) continue;

      // PASS_FAIL 항목은 측정 시 작업자가 OK/NG 직접 선택 — 기준값/공차 불필요.
      if (d.valueType === "PASS_FAIL") {
        dimsInput.push({
          ...(d.id != null ? { id: d.id } : {}),
          dimNo: i + 1,
          dimName: d.dimName.trim(),
          valueType: "PASS_FAIL",
        });
        continue;
      }

      // NUMBER 항목: 항목명은 기존 데이터에 비어있는 경우가 있어 필수 처리하지 않음.
      // 수치값(기준/공차) 만 필수.
      const std = toNumber(d.standardValue);
      const plus = toNumber(d.toleranceUpper);
      const minus = toNumber(d.toleranceLower);
      if (std === null)
        return setError(`치수 ${i + 1}: 기준값을 입력하세요.`);
      if (plus === null)
        return setError(`치수 ${i + 1}: 상한 공차를 입력하세요.`);
      if (minus === null)
        return setError(`치수 ${i + 1}: 하한 공차를 입력하세요.`);
      // 서버도 TOLERANCE_BOUNDS_INVALID 로 막지만, 저장을 눌러보기 전에 알려준다.
      if (minus > plus)
        return setError(
          `치수 ${i + 1}: 하한 공차가 상한보다 큽니다. 부호를 확인해주세요(예: 상한 0.2 / 하한 -0.1).`,
        );

      dimsInput.push({
        ...(d.id != null ? { id: d.id } : {}),
        dimNo: i + 1,
        dimName: d.dimName.trim(),
        standardValue: std,
        toleranceUpper: plus,
        toleranceLower: minus,
        valueType: "NUMBER",
      });
    }

    if (isUploadingSketch)
      return setError("스케치 이미지 업로드가 끝난 뒤 저장해주세요.");

    // 신규 등록은 치수 최소 1개 필요 (제품을 만들면서 치수가 없는 건 어색).
    // 수정은 기존 데이터에 치수가 없는 케이스가 있어 허용 — 다른 필드만 수정해서 저장 가능.
    if (!isEdit && dimsInput.length === 0)
      return setError("치수항목을 최소 1개 이상 입력하세요.");
    if (dimsInput.length > MAX_DIMS)
      return setError(`치수항목은 최대 ${MAX_DIMS}개까지 등록 가능합니다.`);

    // 수정 모드: 사용자가 dims 를 안 건드렸으면 payload 에 dims 안 넣기.
    // 백엔드가 PATCH 받아 dims 통째 교체할 때 기존 dim 이 검사 결과에 묶여있으면
    // 409 RESOURCE_IN_USE 가 뜸. 변경 없으면 보내지 않으면 그 처리 자체를 건너뛴다.
    const dimsKey = JSON.stringify(dims);
    const dimsUnchanged =
      isEdit && dimsKey === originalDimsKeyRef.current;

    const body: CreateProductRequest = {
      customerId: resolvedCustomerId,
      name: name.trim(),
      code: code.trim(),
      process: process as ProcessType,
      sketchUrl: sketchUrl.trim() === "" ? null : sketchUrl.trim(),
      ...(dimsUnchanged ? {} : { dims: dimsInput }),
    } as CreateProductRequest;

    const handlers = {
      onSuccess: () => onClose(),
      onError: (err: unknown) => {
        if (err instanceof AxiosError) {
          const data = err.response?.data as
            | { code?: string; message?: string }
            | undefined;
          const code = data?.code;
          // RESOURCE_IN_USE: 검사·보고서가 참조 중인 dim 을 삭제하거나 종류를 바꾸려 할 때.
          // (기준값/공차/이름 등 값 수정은 id 기반 in-place 로 가능. 삭제·종류변경만 거부됨.)
          if (code === "RESOURCE_IN_USE") {
            setError(
              "이미 검사·보고서가 참조 중인 치수는 삭제하거나 종류를 바꿀 수 없습니다. 값(기준·공차·이름) 수정만 가능합니다.",
            );
            return;
          }
          if (code === "TOLERANCE_BOUNDS_INVALID") {
            setError(
              "하한 공차가 상한보다 큽니다. 부호를 포함해 입력했는지 확인해주세요.",
            );
            return;
          }
          if (code === "PRODUCT_CODE_DUPLICATE") {
            setError("이미 사용 중인 제품 코드입니다.");
            return;
          }
          if (data?.message) {
            setError(data.message);
            return;
          }
        }
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
                {processOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium text-[#212121]">
                스케치 이미지 <span className="text-xs text-[#A8A8A8]">(선택)</span>
              </span>
              {sketchUrl ? (
                <div className="flex items-start gap-3">
                  <SketchPreview key={sketchUrl} src={sketchUrl} />
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={pickSketch}
                      disabled={isUploadingSketch}
                      className="flex items-center gap-1 rounded-md border border-[#931B82] px-3 py-1.5 text-xs font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon
                        icon={isUploadingSketch ? "mdi:loading" : "solar:refresh-linear"}
                        width={14}
                        height={14}
                        className={isUploadingSketch ? "animate-spin" : undefined}
                      />
                      {isUploadingSketch ? "업로드 중..." : "사진 변경"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSketchUrl("");
                        setSketchError(null);
                      }}
                      disabled={isUploadingSketch}
                      className="flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-[#6B7280] transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <Icon icon="mdi:trash-can-outline" width={14} height={14} />
                      삭제
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={pickSketch}
                  disabled={isUploadingSketch}
                  className="flex h-28 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 bg-[#F9FAFB] text-sm font-medium text-[#6B7280] transition-colors hover:border-[#931B82] hover:text-[#931B82] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Icon
                    icon={isUploadingSketch ? "mdi:loading" : "solar:gallery-add-linear"}
                    width={26}
                    height={26}
                    className={isUploadingSketch ? "animate-spin" : undefined}
                  />
                  {isUploadingSketch ? "업로드 중..." : "사진 선택 / 촬영"}
                  <span className="text-xs font-normal text-[#A8A8A8]">
                    PNG/JPG · 최대 10MB
                  </span>
                </button>
              )}
              <input
                ref={sketchInputRef}
                type="file"
                accept="image/*"
                onChange={handleSketchFile}
                className="hidden"
              />
              {sketchError && (
                <span className="text-xs text-[#EF4444]">{sketchError}</span>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[#212121]">
                  검사 항목{" "}
                  <span className="text-xs text-[#6B7280]">
                    ({dims.length}/{MAX_DIMS})
                  </span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={addDim}
                    disabled={dims.length >= MAX_DIMS}
                    className="flex items-center gap-1 rounded-md border border-[#931B82] px-2 py-1 text-xs font-medium text-[#931B82] transition-colors hover:bg-[#F3E8F7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon icon="mdi:plus" width={14} height={14} />
                    치수
                  </button>
                  <button
                    type="button"
                    onClick={addPassFail}
                    disabled={dims.length >= MAX_DIMS}
                    className="flex items-center gap-1 rounded-md border border-[#F59E0B] px-2 py-1 text-xs font-medium text-[#B45309] transition-colors hover:bg-[#FEF3C7] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Icon icon="mdi:plus" width={14} height={14} />
                    OK/NG
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                {dims.map((d, idx) => {
                  const isPassFail = d.valueType === "PASS_FAIL";
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col gap-2 rounded-lg border p-3 ${
                        isPassFail
                          ? "border-[#FEF3C7] bg-[#FFFBEB]"
                          : "border-gray-200 bg-[#FAFAFA]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                            isPassFail ? "text-[#B45309]" : "text-[#6B7280]"
                          }`}
                        >
                          <span
                            className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] ${
                              isPassFail
                                ? "bg-[#FEF3C7] text-[#B45309]"
                                : "bg-[#F3E8F7] text-[#931B82]"
                            }`}
                          >
                            {isPassFail ? "OK/NG" : "치수"}
                          </span>
                          #{idx + 1}
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
                        onChange={(e) =>
                          updateDim(idx, { dimName: e.target.value })
                        }
                        placeholder={
                          isPassFail
                            ? "항목명 (예: 스크래치 여부)"
                            : "항목명 (예: 바깥지름)"
                        }
                        className="h-10 rounded-md border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none"
                      />

                      {isPassFail ? (
                        <p className="text-[11px] text-[#92400E]">
                          작업자가 측정 시점에 OK / NG 를 직접 선택합니다. 기준값·공차는 없습니다.
                        </p>
                      ) : (
                        <div className="grid grid-cols-3 gap-2">
                          <DimNumberInput
                            label="기준"
                            value={d.standardValue}
                            onChange={(v) =>
                              updateDim(idx, { standardValue: v })
                            }
                          />
                          <DimNumberInput
                            label="상한 공차"
                            placeholder="0.2"
                            value={d.toleranceUpper}
                            onChange={(v) => updateDim(idx, upperPatch(d, v))}
                          />
                          <DimNumberInput
                            label="하한 공차"
                            placeholder="-0.2"
                            value={d.toleranceLower}
                            onChange={(v) =>
                              updateDim(idx, {
                                toleranceLower: v,
                                lowerEdited: true,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
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
                disabled={isPending || isUploadingSketch}
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
  placeholder?: string;
}

function DimNumberInput({
  label,
  value,
  onChange,
  placeholder,
}: DimNumberInputProps) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-[#6B7280]">{label}</span>
      <input
        type="number"
        step="any"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-[#931B82] focus:outline-none"
      />
    </label>
  );
}
