import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const STAFF_PASSWORD = "2656";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  const { code, password } = await request.json();

  if (password !== STAFF_PASSWORD) {
    return NextResponse.json({ error: "invalid_password" }, { status: 401 });
  }

  if (!code) {
    return NextResponse.json({ error: "missing_code" }, { status: 400 });
  }

  const { error } = await supabase
    .from("coupons")
    .update({ used: true, used_at: new Date().toISOString() })
    .eq("code", code);

  if (error) {
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    code,
    usedAt: new Date().toISOString(),
  });
}
