"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

const MAX_COUPONS = 100;
const STAFF_PASSWORD = "crow2026";

export default function CouponPage() {
  const [status, setStatus] = useState<
    "loading" | "available" | "issued" | "already" | "ended" | "use" | "used"
  >("loading");
  const [couponCode, setCouponCode] = useState("");
  const [remaining, setRemaining] = useState(MAX_COUPONS);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  async function checkStatus() {
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
        setStatus("available");
      }
    } catch {
      setStatus("available");
    }
  }

  async function issueCoupon() {
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
      localStorage.setItem(
        "crow_gym_coupon",
        JSON.stringify({ code, used: false, issuedAt: new Date().toISOString() })
      );
      setStatus("issued");
    } catch {
      alert("발급 중 오류가 발생했습니다. 다시 시도해주세요.");
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
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="flex justify-center mb-8">
          <Image
            src="/images/logo-stacked-black.png"
            alt="CROW GYM"
            width={200}
            height={160}
            priority
          />
        </div>

        {/* 로딩 */}
        {status === "loading" && (
          <div className="text-center text-gray-500">로딩 중...</div>
        )}

        {/* 발급 가능 */}
        {status === "available" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              1회 무료 이용권
            </h1>
            <p className="text-gray-600 mb-1">
              크로우짐을 무료로 체험해보세요!
            </p>
            <p className="text-sm text-gray-400 mb-6">
              선착순 {MAX_COUPONS}명 한정
            </p>
            <div className="text-sm text-orange-600 font-medium mb-4">
              남은 수량: {remaining}장
            </div>
            <button
              onClick={issueCoupon}
              className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 transition-colors"
            >
              이용권 받기
            </button>
          </div>
        )}

        {/* 방금 발급됨 */}
        {status === "issued" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              발급 완료!
            </h1>
            <p className="text-gray-600 mb-6">
              크로우짐 방문 시 직원에게 보여주세요.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-xs text-gray-400 mb-1">쿠폰 번호</p>
              <p className="text-2xl font-mono font-bold text-black tracking-widest">
                {couponCode}
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ 이 화면을 캡처하거나 저장해주세요.
                <br />
                1인 1회만 발급 가능합니다.
              </p>
            </div>
            <button
              onClick={handleUse}
              className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 transition-colors"
            >
              사용하기 (직원 전용)
            </button>
          </div>
        )}

        {/* 이미 발급받은 경우 */}
        {status === "already" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🎫</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              발급된 이용권
            </h1>
            <p className="text-gray-600 mb-6">
              크로우짐 방문 시 직원에게 보여주세요.
            </p>
            <div className="bg-gray-50 rounded-xl p-6 mb-6">
              <p className="text-xs text-gray-400 mb-1">쿠폰 번호</p>
              <p className="text-2xl font-mono font-bold text-black tracking-widest">
                {couponCode}
              </p>
            </div>
            <button
              onClick={handleUse}
              className="w-full bg-black text-white py-4 rounded-xl text-lg font-bold hover:bg-gray-800 transition-colors"
            >
              사용하기 (직원 전용)
            </button>
          </div>
        )}

        {/* 이벤트 종료 */}
        {status === "ended" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">😢</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              이벤트 종료
            </h1>
            <p className="text-gray-600">
              선착순 {MAX_COUPONS}명이 모두 마감되었습니다.
              <br />
              다음 이벤트를 기대해주세요!
            </p>
          </div>
        )}

        {/* 사용 완료 */}
        {status === "used" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="text-5xl mb-4">🏋️</div>
            <h1 className="text-2xl font-bold text-green-600 mb-2">
              사용 완료
            </h1>
            <p className="text-gray-600 mb-4">
              크로우짐에서 즐거운 운동 되세요!
            </p>
            <div className="bg-green-50 rounded-xl p-6">
              <p className="text-xs text-gray-400 mb-1">쿠폰 번호</p>
              <p className="text-xl font-mono text-gray-400 line-through">
                {couponCode}
              </p>
              <p className="text-green-600 font-bold mt-2">사용 완료됨</p>
            </div>
          </div>
        )}

        {/* 하단 안내 */}
        <p className="text-center text-xs text-gray-400 mt-6">
          CROW GYM | 크로우짐
        </p>
      </div>

      {/* 비밀번호 모달 */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              직원 확인
            </h2>
            <p className="text-sm text-gray-500 mb-4">
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
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-black"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-500 text-sm mb-2 text-center">
                비밀번호가 틀렸습니다.
              </p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium"
              >
                취소
              </button>
              <button
                onClick={confirmUse}
                className="flex-1 py-3 rounded-xl bg-black text-white font-medium"
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
