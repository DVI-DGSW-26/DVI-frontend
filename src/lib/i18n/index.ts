import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// 네임스페이스별 리소스. ko/en 파일 쌍은 항상 같은 키 트리를 가진다.
import koLayout from "./locales/ko/layout";
import koCommon from "./locales/ko/common";
import koAuth from "./locales/ko/auth";
import koDashboard from "./locales/ko/dashboard";
import koInspection from "./locales/ko/inspection";
import koMyInspection from "./locales/ko/myInspection";
import koReport from "./locales/ko/report";
import koCrossCheck from "./locales/ko/crossCheck";
import koProducts from "./locales/ko/products";
import koEquipment from "./locales/ko/equipment";
import koInspectionSchedule from "./locales/ko/inspectionSchedule";
import koCustomers from "./locales/ko/customers";
import koProcess from "./locales/ko/process";
import koInspectionOrders from "./locales/ko/inspectionOrders";
import koAdminInspection from "./locales/ko/adminInspection";
import koIncomplete from "./locales/ko/incomplete";
import koAccountApproval from "./locales/ko/accountApproval";
import koUserSearch from "./locales/ko/userSearch";
import koNotification from "./locales/ko/notification";
import koMonitor from "./locales/ko/monitor";
import koShared from "./locales/ko/shared";

import enLayout from "./locales/en/layout";
import enCommon from "./locales/en/common";
import enAuth from "./locales/en/auth";
import enDashboard from "./locales/en/dashboard";
import enInspection from "./locales/en/inspection";
import enMyInspection from "./locales/en/myInspection";
import enReport from "./locales/en/report";
import enCrossCheck from "./locales/en/crossCheck";
import enProducts from "./locales/en/products";
import enEquipment from "./locales/en/equipment";
import enInspectionSchedule from "./locales/en/inspectionSchedule";
import enCustomers from "./locales/en/customers";
import enProcess from "./locales/en/process";
import enInspectionOrders from "./locales/en/inspectionOrders";
import enAdminInspection from "./locales/en/adminInspection";
import enIncomplete from "./locales/en/incomplete";
import enAccountApproval from "./locales/en/accountApproval";
import enUserSearch from "./locales/en/userSearch";
import enNotification from "./locales/en/notification";
import enMonitor from "./locales/en/monitor";
import enShared from "./locales/en/shared";

export const LANGS = ["ko", "en"] as const;
export type Lang = (typeof LANGS)[number];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ko: {
        layout: koLayout,
        common: koCommon,
        auth: koAuth,
        dashboard: koDashboard,
        inspection: koInspection,
        myInspection: koMyInspection,
        report: koReport,
        crossCheck: koCrossCheck,
        products: koProducts,
        equipment: koEquipment,
        inspectionSchedule: koInspectionSchedule,
        customers: koCustomers,
        process: koProcess,
        inspectionOrders: koInspectionOrders,
        adminInspection: koAdminInspection,
        incomplete: koIncomplete,
        accountApproval: koAccountApproval,
        userSearch: koUserSearch,
        notification: koNotification,
        monitor: koMonitor,
        shared: koShared,
      },
      en: {
        layout: enLayout,
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        inspection: enInspection,
        myInspection: enMyInspection,
        report: enReport,
        crossCheck: enCrossCheck,
        products: enProducts,
        equipment: enEquipment,
        inspectionSchedule: enInspectionSchedule,
        customers: enCustomers,
        process: enProcess,
        inspectionOrders: enInspectionOrders,
        adminInspection: enAdminInspection,
        incomplete: enIncomplete,
        accountApproval: enAccountApproval,
        userSearch: enUserSearch,
        notification: enNotification,
        monitor: enMonitor,
        shared: enShared,
      },
    },
    // 공장 내 사용자는 한국어가 기본. 브라우저 언어로 자동 전환하지 않고,
    // 사용자가 토글한 값(localStorage)만 따른다.
    detection: { order: ["localStorage"], caches: ["localStorage"] },
    fallbackLng: "ko",
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React 가 이미 XSS 를 막는다
  });

// 브라우저 탭 제목과 <html lang> 도 앱 언어를 따른다 — index.html 에는 한국어가 박혀 있다.
// (설치형 앱 이름은 manifest 라 여기서 바꿀 수 없다.)
const APP_TITLE: Record<string, string> = { ko: "콱 플로우", en: "QAC-FLOW" };
function syncDocumentLanguage(lng: string) {
  if (typeof document === "undefined") return;
  const lang = lng.startsWith("ko") ? "ko" : "en";
  document.documentElement.lang = lang;
  document.title = APP_TITLE[lang];
}
syncDocumentLanguage(i18n.language ?? "ko");
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
