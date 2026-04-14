import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST() {
  // 1. 쿠폰 전체 삭제
  const { error: deleteError } = await supabase.from("coupons").delete().gte("id", 0);
  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // 2. 이벤트 버전 올리기
  const { data: current } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "event_version")
    .single();

  const newVersion = String(Number(current?.value || "1") + 1);

  await supabase
    .from("settings")
    .upsert({ key: "event_version", value: newVersion });

  return NextResponse.json({ success: true, version: newVersion });
}
