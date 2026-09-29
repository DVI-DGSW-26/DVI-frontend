import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import koLayout from "./locales/ko/layout";
import koCommon from "./locales/ko/common";
import koAuth from "./locales/ko/auth";
import koDashboard from "./locales/ko/dashboard";
import koInspection from "./locales/ko/inspection";
import koMyInspection from "./locales/ko/myInspection";
import koReport from "./locales/ko/report";

import enLayout from "./locales/en/layout";
import enCommon from "./locales/en/common";
import enAuth from "./locales/en/auth";
import enDashboard from "./locales/en/dashboard";
import enInspection from "./locales/en/inspection";
import enMyInspection from "./locales/en/myInspection";
import enReport from "./locales/en/report";

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
      },
      en: {
        layout: enLayout,
        common: enCommon,
        auth: enAuth,
        dashboard: enDashboard,
        inspection: enInspection,
        myInspection: enMyInspection,
        report: enReport,
      },
    },
    // 공장 내 사용자는 한국어가 기본. 브라우저 언어로 자동 전환하지 않고,
    // 사용자가 토글한 값(localStorage)만 따른다.
    detection: { order: ["localStorage"], caches: ["localStorage"] },
    fallbackLng: "ko",
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React 가 이미 XSS 를 막는다
  });

export default i18n;
