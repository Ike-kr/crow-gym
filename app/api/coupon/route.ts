import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const MAX_COUPONS = 30;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "CG-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET() {
  const { count } = await supabase
    .from("coupons")
    .select("*", { count: "exact", head: true });

  const issued = count || 0;

  // 마감일 정보
  const { data: deadlineData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "event_deadline")
    .single();

  const deadline = deadlineData?.value || null;
  let expired = false;
  if (deadline) {
    expired = new Date() > new Date(deadline + "T23:59:59+09:00");
  }

  return NextResponse.json({
    remaining: MAX_COUPONS - issued,
    total: MAX_COUPONS,
    issued,
    deadline,
    expired,
  });
}

export async function POST() {
  // 마감일 체크
  const { data: deadlineData } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "event_deadline")
    .single();

  if (deadlineData?.value) {
    const deadline = new Date(deadlineData.value + "T23:59:59+09:00");
    if (new Date() > deadline) {
      return NextResponse.json({ error: "expired" }, { status: 400 });
    }
  }

  const { count } = await supabase
    .from("coupons")
    .select("*", { count: "exact", head: true });

  const issued = count || 0;

  if (issued >= MAX_COUPONS) {
    return NextResponse.json({ error: "ended" }, { status: 400 });
  }

  const code = generateCode();

  const { error } = await supabase.from("coupons").insert({ code });

  if (error) {
    // 코드 중복 시 재시도
    const retryCode = generateCode();
    const { error: retryError } = await supabase
      .from("coupons")
      .insert({ code: retryCode });

    if (retryError) {
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }

    return NextResponse.json({
      code: retryCode,
      remaining: MAX_COUPONS - issued - 1,
    });
  }

  return NextResponse.json({
    code,
    remaining: MAX_COUPONS - issued - 1,
  });
}
