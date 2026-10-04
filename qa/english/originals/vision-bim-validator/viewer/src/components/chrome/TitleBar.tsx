import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../../stores/authStore";
import { BrandMark } from "../BrandMark";
import { BRAND } from "../../config/brand";
import "./TitleBar.css";

interface TitleBarProps {
  onSettingsClick?: () => void;
  onFeedbackClick?: () => void;
  onHelpClick?: () => void;
  onUploadClick?: () => void;
}

export default function TitleBar({
  onSettingsClick,
  onFeedbackClick,
  onHelpClick,
  onUploadClick,
}: TitleBarProps) {
  const { t } = useTranslation();

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <a className="titlebar-brand" href={BRAND.home} aria-label="Spanvision Infra home">
          <BrandMark /><span>SPANVISION <small>INFRA</small></span>
        </a>

        <div className="titlebar-quick-access">
          <button
            className="titlebar-quick-btn"
            title={`${t("open")} (Ctrl+O)`}
            aria-label={t("open")}
            onClick={onUploadClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </button>
          <button
            className="titlebar-quick-btn"
            title={t("preferences")}
            aria-label={t("preferences")}
            onClick={onSettingsClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
          </button>
          <button
            className="titlebar-quick-btn"
            title="Help (?)"
            aria-label="Help"
            onClick={onHelpClick}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      <span className="titlebar-title">
        {t("appName")}
      </span>

      <div className="titlebar-controls">
        <UserBadge />
        <button
          className="send-feedback-btn"
          onClick={onFeedbackClick}
        >
          {t("sendFeedback")}
        </button>
      </div>
    </div>
  );
}

function UserBadge() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);

  const [menuOpen, setMenuOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check auth on mount
    useAuthStore.getState().checkAuth();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  if (!user) {
    return (
      <button
        className="titlebar-login-btn"
        onClick={() => login()}
      >
        {t("login")}
      </button>
    );
  }

  const initial = (user.display_name || user.username).charAt(0).toUpperCase();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="titlebar-avatar"
        onClick={() => setMenuOpen((v) => !v)}
        title={user.display_name || user.username}
      >
        {initial}
      </button>
      {menuOpen && (
        <div className="titlebar-user-menu">
          <div className="titlebar-user-menu-name">
            {user.display_name || user.username}
          </div>
          <button
            className="titlebar-user-menu-item"
            onClick={() => {
              setMenuOpen(false);
              window.location.assign("/account");
            }}
          >
            Account
          </button>
          <button
            className="titlebar-user-menu-item"
            onClick={() => {
              setMenuOpen(false);
              logout();
            }}
          >
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}
