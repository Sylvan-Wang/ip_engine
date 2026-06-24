import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 这个接口是"IP引擎 -> UGC创作者商业板块"的免登录跳转桥：
// IP引擎那边已经登录过了，把那次真实登录的会话令牌带过来，这里接住、写成本站点的 cookie 会话，
// 这样创作者不用在两个站点分别登录两次。
export async function GET(request: NextRequest) {
  const accessToken = request.nextUrl.searchParams.get("access_token");
  const refreshToken = request.nextUrl.searchParams.get("refresh_token");
  const redirectPath = request.nextUrl.searchParams.get("redirect") || "/creator/campaigns";

  const response = NextResponse.redirect(new URL(redirectPath, request.url));

  if (!accessToken || !refreshToken) {
    return response;
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      }
    }
  });

  const { data, error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken
  });

  if (error || !data.user) {
    return response;
  }

  // 新用户第一次从IP引擎跳过来：如果还没有创作者商业档案，先建一条空白的，避免页面一片空白。
  const { data: existingProfile } = await supabase
    .from("creator_profiles")
    .select("id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  if (!existingProfile) {
    await supabase.from("creator_profiles").insert({
      user_id: data.user.id,
      display_name: data.user.email?.split("@")[0] || "新创作者",
      location: "",
      interests: "",
      platforms: "",
      follower_count: 0,
      content_style: "",
      contact: "",
      onboarding_completed: false,
      monetization_stage: "nurturing",
      credit_score: 0,
      milestone_count: 0,
      available_for_campaign: true
    });
  }

  return response;
}
