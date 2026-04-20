import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "event_deadline")
    .single();

  return NextResponse.json({ deadline: data?.value || null });
}

export async function POST(request: NextRequest) {
  const { deadline } = await request.json();

  await supabase
    .from("settings")
    .upsert({ key: "event_deadline", value: deadline || "" });

  return NextResponse.json({ success: true, deadline });
}
