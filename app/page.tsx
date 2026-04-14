"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const MAX_COUPONS = 100;
const STAFF_PASSWORD = "2656";

export default function CouponPage() {
  const [status, setStatus] = useState<
    "loading" | "intro" | "available" | "issued" | "already" | "ended" | "used"
  >("loading");
  const [introStep, setIntroStep] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [remaining, setRemaining] = useState(MAX_COUPONS);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [issuing, setIssuing] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
    // 서버 이벤트 버전 확인
    try {
      const vRes = await fetch("/api/admin/version");
      const vData = await vRes.json();
      const serverVersion = vData.version || "1";

      const existingCoupon = localStorage.getItem("crow_gym_coupon");
      if (existingCoupon) {
        const data = JSON.parse(existingCoupon);
        // 버전이 다르면 이전 이벤트 쿠폰 → 삭제하고 새로 참여 가능
        if (data.version !== serverVersion) {
          localStorage.removeItem("crow_gym_coupon");
        } else {
          setCouponCode(data.code);
          if (data.used) {
            setStatus("used");
          } else {
            setStatus("already");
          }
          fetchRemaining();
          return;
        }
      }
    } catch {
      // 버전 API 실패 시 기존 로직
      const existingCoupon = localStorage.getItem("crow_gym_coupon");
      if (existingCoupon) {
        const data = JSON.parse(existingCoupon);
        setCouponCode(data.code);
        if (data.used) {
          setStatus("used");
        } else {
          setStatus("already");
        }
        fetchRemaining();
        return;
      }
    }
    await fetchRemaining();
  }

  async function fetchRemaining() {
    try {
      const res = await fetch("/api/coupon");
      const data = await res.json();
      setRemaining(data.remaining);
      if (data.remaining <= 0 && !localStorage.getItem("crow_gym_coupon")) {
        setStatus("ended");
      } else if (!localStorage.getItem("crow_gym_coupon")) {
        setStatus("intro");
        // 인트로 애니메이션 시작
        setTimeout(() => setIntroStep(1), 500);
        setTimeout(() => setIntroStep(2), 2000);
        setTimeout(() => setIntroStep(3), 3500);
        setTimeout(() => {
          setIntroStep(4);
          setStatus("available");
        }, 5000);
      }
    } catch {
      setStatus("intro");
      setTimeout(() => setStatus("available"), 3000);
    }
  }

  async function issueCoupon() {
    if (issuing) return;
    setIssuing(true);
    try {
      const res = await fetch("/api/coupon", { method: "POST" });
      const data = await res.json();
      if (data.error === "ended") {
        setStatus("ended");
        return;
      }
      const code = data.code;
      setCouponCode(code);
      setRemaining(data.remaining);
      // 현재 이벤트 버전도 저장
      let version = "1";
      try {
        const vRes = await fetch("/api/admin/version");
        const vData = await vRes.json();
        version = vData.version || "1";
      } catch { /* 기본값 사용 */ }
      localStorage.setItem(
        "crow_gym_coupon",
        JSON.stringify({ code, used: false, issuedAt: new Date().toISOString(), version })
      );
      setStatus("issued");
    } catch {
      alert("발급 중 오류가 발생했습니다. 다시 시도해주세요.");
      setIssuing(false);
    }
  }

  function handleUse() {
    setShowPasswordModal(true);
    setPassword("");
    setPasswordError(false);
  }

  async function confirmUse() {
    if (password === STAFF_PASSWORD) {
      const couponData = JSON.parse(
        localStorage.getItem("crow_gym_coupon") || "{}"
      );
      couponData.used = true;
      couponData.usedAt = new Date().toISOString();
      localStorage.setItem("crow_gym_coupon", JSON.stringify(couponData));
      fetch("/api/use-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, password }),
      });
      setShowPasswordModal(false);
      setStatus("used");
    } else {
      setPasswordError(true);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-4 bg-[#0A0A0A] min-h-screen">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Image
            src="/images/logo-stacked-white.png"
            alt="CROW GYM"
            width={180}
            height={144}
            priority
          />
        </div>

        {/* 로딩 */}
        {status === "loading" && (
          <div className="text-center text-gray-500">로딩 중...</div>
        )}

        {/* 인트로 애니메이션 */}
        {status === "intro" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
            {introStep >= 1 && (
              <p className="text-xl text-white mb-4 animate-fade-in">
                하지 말라는 건 못 참는 타입이구나 💪
              </p>
            )}
            {introStep >= 2 && (
              <p className="text-lg text-gray-300 mb-4 animate-fade-in">
                그 도전 정신, 칭찬해
              </p>
            )}
            {introStep >= 3 && (
              <div className="animate-fade-in">
                <p className="text-xl text-[#F5A623] font-bold mb-1">
                  도전하는 자만이 가져간다.
                </p>
                <p className="text-gray-400">
                  너를 위한 선물을 준비했어 🎁
                </p>
              </div>
            )}
          </div>
        )}

        {/* 발급 가능 */}
        {status === "available" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] p-8 text-center">
            <h1 className="text-2xl font-bold text-white mb-2">
              1회 무료 이용권
            </h1>
            <p className="text-sm text-gray-500 mb-6">
              선착순 {MAX_COUPONS}명 한정
            </p>

            {/* 남은 수량 카운터 */}
            <div className="bg-[#111] rounded-xl p-4 mb-6 border border-[#333]">
              <p className="text-xs text-gray-500 mb-1">남은 이용권</p>
              <p className="text-3xl font-bold text-[#F5A623]">
                {remaining}<span className="text-lg text-gray-500">/{MAX_COUPONS}</span>
              </p>
            </div>

            <button
              onClick={issueCoupon}
              disabled={issuing}
              className="w-full bg-[#F5A623] text-black py-4 rounded-xl text-lg font-bold hover:bg-[#e09810] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {issuing ? "발급 중..." : "선물 받기"}
            </button>

            {/* 안내 문구 */}
            <div className="mt-4 space-y-1">
              <p className="text-xs text-gray-500 text-center">1인 1회 발급 | 중복 참여 불가</p>
              <p className="text-xs text-gray-500 text-center">양도/거래 불가 | 본인만 사용 가능</p>
              <p className="text-xs text-gray-600 text-center">크로우짐 데스크에서 직원 확인 후 사용</p>
            </div>
          </div>
        )}

        {/* 방금 발급됨 */}
        {status === "issued" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#F5A623]/30 p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              발급 완료!
            </h1>
            <p className="text-gray-400 mb-6">
              크로우짐 방문 시 직원에게 보여주세요.
            </p>

            {/* 쿠폰 카드 */}
            <div className="bg-[#111] rounded-xl p-6 mb-4 border border-[#F5A623]/40">
              <p className="text-xs text-[#F5A623] mb-1 tracking-widest uppercase">Coupon Code</p>
              <p className="text-3xl font-mono font-bold text-white tracking-widest">
                {couponCode}
              </p>
            </div>

            <div className="bg-[#1E1E1E] border border-[#333] rounded-xl p-3 mb-6">
              <p className="text-sm text-gray-400">
                이 화면을 캡처해주세요. 1인 1회만 발급됩니다.
              </p>
            </div>

            <button
              onClick={handleUse}
              className="w-full bg-[#F5A623] text-black py-4 rounded-xl text-lg font-bold hover:bg-[#e09810] transition-colors"
            >
              사용하기 (직원 전용)
            </button>
          </div>
        )}

        {/* 이미 발급받은 경우 */}
        {status === "already" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#F5A623]/30 p-8 text-center">
            <h1 className="text-xl font-bold text-white mb-2">
              나의 이용권
            </h1>
            <p className="text-gray-400 mb-6">
              크로우짐 방문 시 직원에게 보여주세요.
            </p>

            {/* 쿠폰 카드 */}
            <div className="bg-[#111] rounded-xl p-6 mb-6 border border-[#F5A623]/40">
              <p className="text-xs text-[#F5A623] mb-1 tracking-widest uppercase">Coupon Code</p>
              <p className="text-3xl font-mono font-bold text-white tracking-widest">
                {couponCode}
              </p>
              <p className="text-xs text-gray-500 mt-2">1회 무료 이용권</p>
            </div>

            <button
              onClick={handleUse}
              className="w-full bg-[#F5A623] text-black py-4 rounded-xl text-lg font-bold hover:bg-[#e09810] transition-colors"
            >
              사용하기 (직원 전용)
            </button>
          </div>
        )}

        {/* 이벤트 종료 */}
        {status === "ended" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] p-8 text-center">
            <div className="text-4xl mb-3">🚫</div>
            <h1 className="text-2xl font-bold text-white mb-2">
              이벤트 종료
            </h1>
            <p className="text-gray-400">
              선착순 {MAX_COUPONS}명이 모두 마감되었습니다.
              <br />
              <span className="text-gray-500">다음 이벤트를 기대해주세요!</span>
            </p>
          </div>
        )}

        {/* 사용 완료 */}
        {status === "used" && (
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] p-8 text-center opacity-70">
            <div className="text-4xl mb-3">🏋️</div>
            <h1 className="text-xl font-bold text-gray-500 mb-2">
              사용 완료
            </h1>
            <p className="text-gray-600 mb-4">
              크로우짐에서 즐거운 운동 되세요!
            </p>
            <div className="bg-[#111] rounded-xl p-6 border border-[#222] relative overflow-hidden">
              <p className="text-xs text-gray-600 mb-1">쿠폰 번호</p>
              <p className="text-xl font-mono text-gray-600 line-through">
                {couponCode}
              </p>
              {/* USED 도장 */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-4 border-red-500/60 rounded-lg px-6 py-2 rotate-[-15deg]">
                  <p className="text-red-500/60 text-3xl font-black tracking-widest">USED</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        <p className="text-center text-xs text-gray-600 mt-6">
          CROW GYM | 크로우짐
        </p>
      </div>

      {/* 비밀번호 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-50">
          <div className="bg-[#1A1A1A] rounded-2xl p-6 w-full max-w-sm border border-[#333]">
            <h2 className="text-lg font-bold text-white mb-2">
              직원 확인
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              직원 비밀번호를 입력해주세요.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && confirmUse()}
              placeholder="비밀번호"
              className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3 mb-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm mb-2 text-center">
                비밀번호가 틀렸습니다.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-3 rounded-xl border border-[#333] text-gray-400 font-medium hover:bg-[#222] transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmUse}
                className="flex-1 py-3 rounded-xl bg-[#F5A623] text-black font-bold hover:bg-[#e09810] transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
