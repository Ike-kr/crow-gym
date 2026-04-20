"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";

const ADMIN_PASSWORD = "2656";

interface Coupon {
  id: number;
  code: string;
  issued_at: string;
  used: boolean;
  used_at: string | null;
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons");
      const data = await res.json();
      setCoupons(data.coupons || []);
    } catch {
      // 에러 무시
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authenticated) {
      fetchCoupons();
    }
  }, [authenticated, fetchCoupons]);

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  }

  const [resetting, setResetting] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [savingDeadline, setSavingDeadline] = useState(false);

  useEffect(() => {
    fetch("/api/admin/deadline")
      .then((r) => r.json())
      .then((d) => setDeadline(d.deadline || ""))
      .catch(() => {});
  }, []);

  async function handleSaveDeadline() {
    setSavingDeadline(true);
    try {
      await fetch("/api/admin/deadline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: deadline || null }),
      });
      alert(deadline ? `마감일이 ${deadline}로 설정되었습니다.` : "마감일이 해제되었습니다.");
    } catch {
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSavingDeadline(false);
    }
  }

  async function handleReset() {
    if (!confirm("정말 모든 쿠폰 데이터를 초기화하시겠습니까?\n테스트 데이터가 전부 삭제됩니다.")) return;
    if (!confirm("한번 더 확인합니다. 초기화하면 되돌릴 수 없습니다.")) return;
    setResetting(true);
    try {
      const res = await fetch("/api/admin/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setCoupons([]);
        alert("초기화 완료! 쿠폰이 30장으로 리셋되었습니다.");
      } else {
        alert("초기화 실패: " + (data.error || "알 수 없는 오류"));
      }
    } catch {
      alert("초기화 중 오류가 발생했습니다.");
    } finally {
      setResetting(false);
    }
  }

  const totalIssued = coupons.length;
  const totalUsed = coupons.filter((c) => c.used).length;
  const remaining = 30 - totalIssued;

  if (!authenticated) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center p-6 bg-[#0A0A0A] min-h-screen">
        <div className="w-full max-w-sm">
          <div className="flex justify-center mb-8">
            <Image
              src="/images/logo-stacked-white.png"
              alt="CROW GYM"
              width={140}
              height={112}
              priority
            />
          </div>
          <div className="bg-[#1A1A1A] rounded-2xl border border-[#333] p-6 text-center">
            <h1 className="text-lg font-bold text-white mb-4">관리자 로그인</h1>
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError(false);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="비밀번호"
              className="w-full bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3 mb-2 text-center text-lg focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
              autoFocus
            />
            {passwordError && (
              <p className="text-red-400 text-sm mb-2">비밀번호가 틀렸습니다.</p>
            )}
            <button
              onClick={handleLogin}
              className="w-full bg-[#F5A623] text-black py-3 rounded-xl font-bold mt-2 hover:bg-[#e09810] transition-colors"
            >
              로그인
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 flex flex-col p-4 bg-[#0A0A0A] min-h-screen">
      <div className="w-full max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo-horizontal-white.png"
              alt="CROW GYM"
              width={120}
              height={30}
            />
            <span className="text-gray-500 text-sm">Admin</span>
          </div>
          <button
            onClick={fetchCoupons}
            className="text-sm text-[#F5A623] hover:underline"
          >
            새로고침
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">발급됨</p>
            <p className="text-2xl font-bold text-white">{totalIssued}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">사용됨</p>
            <p className="text-2xl font-bold text-[#F5A623]">{totalUsed}</p>
          </div>
          <div className="bg-[#1A1A1A] rounded-xl border border-[#333] p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">남은 수량</p>
            <p className="text-2xl font-bold text-green-400">{remaining}</p>
          </div>
        </div>

        {/* 쿠폰 목록 */}
        <div className="bg-[#1A1A1A] rounded-xl border border-[#333] overflow-hidden">
          <div className="px-4 py-3 border-b border-[#333]">
            <h2 className="text-sm font-bold text-white">
              쿠폰 발급 내역 ({totalIssued}건)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">로딩 중...</div>
          ) : coupons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              아직 발급된 쿠폰이 없습니다.
            </div>
          ) : (
            <div className="divide-y divide-[#222]">
              {coupons.map((coupon) => (
                <div
                  key={coupon.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-mono text-white text-sm">
                      {coupon.code}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(coupon.issued_at).toLocaleString("ko-KR")}
                    </p>
                  </div>
                  <div>
                    {coupon.used ? (
                      <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full">
                        사용 완료
                      </span>
                    ) : (
                      <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">
                        미사용
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 이벤트 마감일 설정 */}
        <div className="mt-6 bg-[#1A1A1A] rounded-xl border border-[#333] p-4">
          <h3 className="text-sm font-bold text-white mb-3">⏰ 이벤트 마감일</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="flex-1 bg-[#111] border border-[#333] text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#F5A623]"
            />
            <button
              onClick={handleSaveDeadline}
              disabled={savingDeadline}
              className="bg-[#F5A623] text-black px-4 py-3 rounded-xl font-bold hover:bg-[#e09810] transition-colors disabled:opacity-50"
            >
              {savingDeadline ? "..." : "저장"}
            </button>
          </div>
          {deadline ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {deadline} 23:59까지 쿠폰 발급 가능
              </p>
              <button
                onClick={() => { setDeadline(""); handleSaveDeadline(); }}
                className="text-xs text-red-400 hover:underline"
              >
                마감일 해제
              </button>
            </div>
          ) : (
            <p className="text-xs text-gray-500">마감일 미설정 — 수량 소진 시까지 발급 가능</p>
          )}
        </div>

        {/* 초기화 버튼 */}
        <div className="mt-4 bg-[#1A1A1A] rounded-xl border border-[#333] p-4">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="w-full bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetting ? "초기화 중..." : "전체 초기화 (쿠폰 30장 리셋)"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            테스트 후 실제 서비스 시작 전에 사용하세요.
          </p>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          CROW GYM Admin
        </p>
      </div>
    </main>
  );
}
