import React, { useState, useEffect, useRef } from "react";
import {
  Phone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Shield,
  Edit2,
  ChevronDown,
  Loader,
} from "lucide-react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

// ─── Country code list (India default) ──────────────────────────────────────
const COUNTRY_CODES = [
  { code: "+91", name: "India", flag: "🇮🇳" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+61", name: "Australia", flag: "🇦🇺" },
  { code: "+971", name: "UAE", flag: "🇦🇪" },
  { code: "+65", name: "Singapore", flag: "🇸🇬" },
  { code: "+49", name: "Germany", flag: "🇩🇪" },
  { code: "+33", name: "France", flag: "🇫🇷" },
  { code: "+81", name: "Japan", flag: "🇯🇵" },
  { code: "+86", name: "China", flag: "🇨🇳" },
  { code: "+55", name: "Brazil", flag: "🇧🇷" },
  { code: "+7", name: "Russia", flag: "🇷🇺" },
  { code: "+82", name: "South Korea", flag: "🇰🇷" },
  { code: "+27", name: "South Africa", flag: "🇿🇦" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾" },
];

const RESEND_COOLDOWN = 60; // seconds

// ─── OTP Digit Input ─────────────────────────────────────────────────────────
const OTPInput = ({ value, onChange, disabled }) => {
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  const handleKey = (e, idx) => {
    if (e.key === "Backspace") {
      const next = [...digits];
      if (next[idx]) {
        next[idx] = "";
        onChange(next.join(""));
      } else if (idx > 0) {
        inputRefs[idx - 1].current?.focus();
        next[idx - 1] = "";
        onChange(next.join(""));
      }
    }
  };

  const handleChange = (e, idx) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const ch = raw[raw.length - 1];
    const next = [...digits];
    next[idx] = ch;
    onChange(next.join(""));
    if (idx < 5) inputRefs[idx + 1].current?.focus();
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted.padEnd(6, "").slice(0, 6));
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs[focusIdx].current?.focus();
  };

  return (
    <div style={{ display: "flex", gap: "10px" }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={inputRefs[i]}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          disabled={disabled}
          onChange={(e) => handleChange(e, i)}
          onKeyDown={(e) => handleKey(e, i)}
          onPaste={handlePaste}
          style={{
            width: "44px",
            height: "52px",
            textAlign: "center",
            fontSize: "1.4rem",
            fontWeight: 600,
            fontFamily: "var(--font-serif)",
            border: `1.5px solid ${d ? "var(--accent-burgundy)" : "var(--border-color)"}`,
            borderRadius: "var(--radius-sm)",
            backgroundColor: disabled ? "var(--bg-primary)" : "#FFFFFF",
            color: "var(--text-primary)",
            outline: "none",
            transition: "border-color 150ms ease",
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={(e) => (e.target.style.borderColor = "var(--accent-burgundy)")}
          onBlur={(e) =>
            (e.target.style.borderColor = d ? "var(--accent-burgundy)" : "var(--border-color)")
          }
        />
      ))}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const PhoneVerification = () => {
  const { user, updatePhoneVerification, isSupabaseConfigured: sbConf } = useAuth();

  // States
  const [countryCode, setCountryCode] = useState("+91");
  const [phoneInput, setPhoneInput] = useState("");
  const [step, setStep] = useState("input"); // 'input' | 'otp' | 'verified'
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fullPhone, setFullPhone] = useState("");
  const timerRef = useRef(null);
  const dropdownRef = useRef(null);

  // On mount: if user already has a verified phone, show verified state
  useEffect(() => {
    if (user?.phone && user?.phone_verified) {
      setStep("verified");
      setFullPhone(user.phone);
    } else if (user?.phone && !user?.phone_verified) {
      // Pre-fill if a phone exists but isn't verified
      const existing = user.phone;
      const match = COUNTRY_CODES.find((c) => existing.startsWith(c.code));
      if (match) {
        setCountryCode(match.code);
        setPhoneInput(existing.slice(match.code.length).trim());
      } else {
        setPhoneInput(existing);
      }
    }
  }, [user]);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      timerRef.current = setTimeout(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearTimeout(timerRef.current);
  }, [countdown]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const buildFullPhone = () => `${countryCode}${phoneInput.replace(/\s/g, "")}`;

  const validatePhone = () => {
    const digits = phoneInput.replace(/\D/g, "");
    if (!digits) return "Please enter a phone number.";
    if (digits.length < 7 || digits.length > 12) return "Please enter a valid phone number.";
    return null;
  };

  // ── Send OTP ──────────────────────────────────────────────────────────────
  const handleSendOTP = async () => {
    const validationErr = validatePhone();
    if (validationErr) { setError(validationErr); return; }
    setError("");
    setLoading(true);

    const phone = buildFullPhone();

    if (!sbConf || !supabase) {
      // Demo mode: simulate OTP send
      setLoading(false);
      setFullPhone(phone);
      setStep("otp");
      setCountdown(RESEND_COOLDOWN);
      setSuccessMsg(`OTP sent to ${phone} (Demo mode — enter any 6 digits to verify).`);
      return;
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-otp", {
        body: { phone },
      });

      if (fnErr || !data?.success) {
        const msg = data?.error || fnErr?.message || "Failed to send OTP. Please try again.";
        setError(msg);
      } else {
        setFullPhone(phone);
        setStep("otp");
        setCountdown(RESEND_COOLDOWN);
        setSuccessMsg(`OTP sent to ${phone}`);
      }
    } catch (e) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP ────────────────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    if (otp.replace(/\D/g, "").length < 6) {
      setError("Please enter the complete 6-digit OTP.");
      return;
    }
    setError("");
    setLoading(true);

    if (!sbConf || !supabase) {
      // Demo mode: accept any 6-digit code
      setLoading(false);
      if (otp.length === 6) {
        await updatePhoneVerification(fullPhone, true);
        setStep("verified");
        setSuccessMsg("Phone number verified successfully!");
      } else {
        setError("Incorrect OTP. Please try again.");
      }
      return;
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("verify-otp", {
        body: { phone: fullPhone, code: otp },
      });

      if (fnErr || !data?.success) {
        const msg = data?.error || fnErr?.message || "Incorrect OTP. Please try again.";
        setError(msg);
      } else {
        await updatePhoneVerification(fullPhone, true);
        setStep("verified");
        setSuccessMsg("Phone number verified successfully!");
        setOtp("");
      }
    } catch (e) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Resend OTP ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (countdown > 0) return;
    setOtp("");
    setError("");
    setLoading(true);

    if (!sbConf || !supabase) {
      setLoading(false);
      setCountdown(RESEND_COOLDOWN);
      setSuccessMsg("OTP resent (Demo mode).");
      return;
    }

    try {
      const { data, error: fnErr } = await supabase.functions.invoke("send-otp", {
        body: { phone: fullPhone },
      });
      if (fnErr || !data?.success) {
        setError(data?.error || "Failed to resend OTP.");
      } else {
        setCountdown(RESEND_COOLDOWN);
        setSuccessMsg("A new OTP has been sent.");
      }
    } catch (e) {
      setError("Network error.");
    } finally {
      setLoading(false);
    }
  };

  // ── Edit / Change phone ───────────────────────────────────────────────────
  const handleChangePhone = () => {
    setStep("input");
    setOtp("");
    setError("");
    setSuccessMsg("");
    setFullPhone("");
    setCountdown(0);
    // Clear verified phone from user profile
    updatePhoneVerification(null, false);
    setPhoneInput("");
  };

  const selectedCountry = COUNTRY_CODES.find((c) => c.code === countryCode) || COUNTRY_CODES[0];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        marginTop: "32px",
        paddingTop: "28px",
        borderTop: "1px solid var(--border-color)",
      }}
    >
      {/* Section Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
        <Shield size={18} color="var(--accent-burgundy)" />
        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, letterSpacing: "0.01em" }}>
          Phone Number Verification
        </h3>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px", lineHeight: 1.6 }}>
        Verify your mobile number for auction notifications, secure account recovery, and white-glove
        transport coordination.
      </p>

      {/* ── STEP: VERIFIED ─────────────────────────────────────────────── */}
      {step === "verified" && (
        <div>
          {/* Success banner */}
          {successMsg && (
            <div
              style={{
                backgroundColor: "var(--badge-shipping-bg)",
                border: "1px solid rgba(56,107,73,0.25)",
                borderRadius: "var(--radius-xs)",
                padding: "12px 16px",
                marginBottom: "18px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "12.5px",
                color: "var(--badge-shipping-text)",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}
          {/* Verified phone display */}
          <div
            style={{
              border: "1px solid rgba(56,107,73,0.3)",
              borderRadius: "var(--radius-xs)",
              padding: "16px 20px",
              backgroundColor: "#F5FAF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: "12px",
              maxWidth: "420px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <Phone size={16} color="var(--success-color)" />
              <div>
                <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--text-primary)" }}>
                  {fullPhone}
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    marginTop: "4px",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--success-color)",
                    textTransform: "uppercase",
                  }}
                >
                  <CheckCircle2 size={12} />
                  Verified
                </div>
              </div>
            </div>
            <button
              onClick={handleChangePhone}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "12px",
                color: "var(--accent-burgundy)",
                fontWeight: 600,
                background: "none",
                border: "1px solid var(--border-color)",
                borderRadius: "var(--radius-xs)",
                padding: "6px 12px",
                cursor: "pointer",
                transition: "background 120ms",
              }}
              onMouseEnter={(e) => (e.target.style.backgroundColor = "var(--surface-secondary)")}
              onMouseLeave={(e) => (e.target.style.backgroundColor = "transparent")}
            >
              <Edit2 size={12} />
              Change
            </button>
          </div>
        </div>
      )}

      {/* ── STEP: INPUT PHONE ──────────────────────────────────────────── */}
      {step === "input" && (
        <div style={{ maxWidth: "420px" }}>
          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "8px",
            }}
          >
            Mobile Phone Number
          </label>

          <div style={{ display: "flex", gap: "8px" }}>
            {/* Country code dropdown */}
            <div ref={dropdownRef} style={{ position: "relative", flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setShowDropdown((v) => !v)}
                style={{
                  height: "42px",
                  padding: "0 10px 0 12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-xs)",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap",
                  transition: "border-color 150ms",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent-burgundy)")}
                onMouseLeave={(e) =>
                  !showDropdown && (e.currentTarget.style.borderColor = "var(--border-color)")
                }
              >
                <span>{selectedCountry.flag}</span>
                <span>{countryCode}</span>
                <ChevronDown size={13} color="var(--text-secondary)" />
              </button>
              {showDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    zIndex: 50,
                    width: "220px",
                    backgroundColor: "#FFFFFF",
                    border: "1px solid var(--border-color)",
                    borderRadius: "var(--radius-xs)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                    maxHeight: "220px",
                    overflowY: "auto",
                  }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => {
                        setCountryCode(c.code);
                        setShowDropdown(false);
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "9px 14px",
                        fontSize: "12.5px",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        backgroundColor:
                          c.code === countryCode ? "rgba(120,59,75,0.06)" : "transparent",
                        color:
                          c.code === countryCode ? "var(--accent-burgundy)" : "var(--text-primary)",
                        fontWeight: c.code === countryCode ? 600 : 400,
                        cursor: "pointer",
                        borderBottom: "1px solid var(--border-color)",
                        transition: "background 120ms",
                      }}
                      onMouseEnter={(e) =>
                        c.code !== countryCode &&
                        (e.currentTarget.style.backgroundColor = "var(--surface-secondary)")
                      }
                      onMouseLeave={(e) =>
                        c.code !== countryCode &&
                        (e.currentTarget.style.backgroundColor = "transparent")
                      }
                    >
                      <span>{c.flag}</span>
                      <span style={{ flex: 1 }}>{c.name}</span>
                      <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>{c.code}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Phone number input */}
            <input
              type="tel"
              className="form-input"
              value={phoneInput}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                setError("");
              }}
              placeholder="98201 44820"
              style={{ flex: 1, height: "42px" }}
              onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
            />
          </div>

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "8px",
                fontSize: "12px",
                color: "var(--error-color)",
              }}
            >
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleSendOTP}
            disabled={loading || !phoneInput.trim()}
            style={{
              marginTop: "14px",
              height: "42px",
              padding: "0 24px",
              backgroundColor:
                loading || !phoneInput.trim() ? "var(--surface-secondary)" : "var(--accent-burgundy)",
              color: loading || !phoneInput.trim() ? "var(--text-secondary)" : "#FFFFFF",
              border: "none",
              borderRadius: "var(--radius-xs)",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.03em",
              cursor: loading || !phoneInput.trim() ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 150ms ease",
            }}
          >
            {loading && <Loader size={14} className="spin-anim" />}
            {loading ? "Sending OTP…" : "Send OTP"}
          </button>
        </div>
      )}

      {/* ── STEP: ENTER OTP ────────────────────────────────────────────── */}
      {step === "otp" && (
        <div style={{ maxWidth: "420px" }}>
          {/* Info */}
          <div
            style={{
              backgroundColor: "rgba(120,59,75,0.05)",
              border: "1px solid rgba(120,59,75,0.18)",
              borderRadius: "var(--radius-xs)",
              padding: "12px 16px",
              marginBottom: "20px",
              fontSize: "12.5px",
              color: "var(--text-primary)",
              lineHeight: 1.55,
            }}
          >
            {successMsg ||
              `A 6-digit OTP has been sent to ${fullPhone}. It expires in 10 minutes.`}
          </div>

          <label
            style={{
              display: "block",
              fontSize: "12px",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-secondary)",
              marginBottom: "12px",
            }}
          >
            Enter OTP
          </label>

          <OTPInput value={otp} onChange={setOtp} disabled={loading} />

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                marginTop: "10px",
                fontSize: "12px",
                color: "var(--error-color)",
              }}
            >
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Verify button */}
          <button
            type="button"
            onClick={handleVerifyOTP}
            disabled={loading || otp.replace(/\D/g, "").length < 6}
            style={{
              marginTop: "18px",
              height: "42px",
              padding: "0 24px",
              backgroundColor:
                loading || otp.replace(/\D/g, "").length < 6
                  ? "var(--surface-secondary)"
                  : "var(--accent-burgundy)",
              color:
                loading || otp.replace(/\D/g, "").length < 6
                  ? "var(--text-secondary)"
                  : "#FFFFFF",
              border: "none",
              borderRadius: "var(--radius-xs)",
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.03em",
              cursor:
                loading || otp.replace(/\D/g, "").length < 6 ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 150ms ease",
            }}
          >
            {loading && <Loader size={14} className="spin-anim" />}
            {loading ? "Verifying…" : "Verify OTP"}
          </button>

          {/* Resend + Change phone row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              marginTop: "14px",
              fontSize: "12.5px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                color: countdown > 0 ? "var(--text-secondary)" : "var(--accent-burgundy)",
                fontWeight: 600,
                background: "none",
                border: "none",
                cursor: countdown > 0 ? "not-allowed" : "pointer",
                padding: 0,
                fontSize: "12.5px",
              }}
            >
              <RefreshCw size={12} />
              {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
            </button>
            <span style={{ opacity: 0.3 }}>•</span>
            <button
              type="button"
              onClick={handleChangePhone}
              style={{
                color: "var(--text-secondary)",
                fontWeight: 500,
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                fontSize: "12.5px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <Edit2 size={11} />
              Change number
            </button>
          </div>
        </div>
      )}

      <style>{`
        .spin-anim {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PhoneVerification;
