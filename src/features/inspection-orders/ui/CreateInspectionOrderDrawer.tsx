import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import {
  useCreateInspectionOrder,
  useEquipmentList,
  useProductList,
  useUpdateInspectionOrder,
  useUsersByRole,
} from "../api";
import type { InspectionOrder } from "../api";

interface Props {
  open: boolean;
  onClose: () => void;
  order?: InspectionOrder | null;
}

function todayISO() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function CreateInspectionOrderDrawer({
  open,
  onClose,
  order,
}: Props) {
  const isEdit = !!order;
  const [targetDate, setTargetDate] = useState(todayISO);
  const [equipmentId, setEquipmentId] = useState<number | "">("");
  const [productId, setProductId] = useState<number | "">("");
  const [productionId, setProductionId] = useState<number | "">("");
  const [qualityId, setQualityId] = useState<number | "">("");

  const { data: equipment = [], isLoading: loadingEquipment } = useEquipmentList();
  const { data: products = [], isLoading: loadingProducts } = useProductList();
  const { data: productionUsers = [], isLoading: loadingProduction } =
    useUsersByRole("PRODUCTION");
  const { data: qualityUsers = [], isLoading: loadingQuality } =
    useUsersByRole("QUALITY");
  const { mutate: create, isPending: isCreating } = useCreateInspectionOrder();
  const { mutate: update, isPending: isUpdating } = useUpdateInspectionOrder();
  const isPending = isCreating || isUpdating;

  useEffect(() => {
    if (!open) return;
    if (order) {
      setTargetDate(order.targetDate);
      setEquipmentId(order.equipment.id);
      setProductId(order.product.id);
      setProductionId(order.production.id);
      setQualityId(order.quality.id);
    } else {
      setTargetDate(todayISO());
      setEquipmentId("");
      setProductId("");
      setProductionId("");
      setQualityId("");
    }
  }, [open, order]);

  const canSubmit =
    !!targetDate &&
    equipmentId !== "" &&
    productId !== "" &&
    productionId !== "" &&
    qualityId !== "" &&
    !isPending;

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!canSubmit) return;
    const body = {
      productId: productId as number,
      equipmentId: equipmentId as number,
      productionId: productionId as number,
      qualityId: qualityId as number,
      targetDate,
    };
    const handlers = {
      onSuccess: () => onClose(),
      onError: () => {
        alert(
          isEdit
            ? "검사지시 수정 중 오류가 발생했습니다."
            : "검사지시 등록 중 오류가 발생했습니다.",
        );
      },
    };
    if (isEdit && order) {
      update({ orderId: order.id, body }, handlers);
    } else {
      create(body, handlers);
    }
  };

  const title = isEdit ? "검사지시 수정" : "검사지시 등록";
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
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
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

        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">지시 날짜</span>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              required
              className="h-11 rounded-lg border border-gray-300 px-3 text-sm focus:border-[#931B82] focus:outline-none"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">설비 선택</span>
            <select
              value={equipmentId}
              onChange={(e) =>
                setEquipmentId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingEquipment}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingEquipment ? "불러오는 중..." : "설비를 선택하세요"}
              </option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">제품 선택</span>
            <select
              value={productId}
              onChange={(e) =>
                setProductId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingProducts}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingProducts ? "불러오는 중..." : "제품을 선택하세요"}
              </option>
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">
              자주검사 작업자 (생산부)
            </span>
            <select
              value={productionId}
              onChange={(e) =>
                setProductionId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingProduction}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingProduction ? "불러오는 중..." : "작업자를 선택하세요"}
              </option>
              {productionUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.loginId})
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-[#212121]">
              순회검사 품질 담당자
            </span>
            <select
              value={qualityId}
              onChange={(e) =>
                setQualityId(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
              disabled={loadingQuality}
              className="h-11 rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-[#931B82] focus:outline-none disabled:bg-gray-50"
            >
              <option value="">
                {loadingQuality ? "불러오는 중..." : "품질 담당자를 선택하세요"}
              </option>
              {qualityUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.loginId})
                </option>
              ))}
            </select>
          </label>

          <div className="mt-auto flex gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-lg border border-gray-300 text-sm font-medium text-[#212121] transition-colors hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="h-11 flex-1 rounded-lg bg-[#931B82] text-sm font-medium text-white transition-colors hover:bg-[#6A0F5D] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitLabel}
            </button>
          </div>
        </form>
      </aside>
    </>
  );
}
