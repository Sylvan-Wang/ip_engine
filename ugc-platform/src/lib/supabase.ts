import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("缺少 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 环境变量。");
}

// 第一版没有真实登录界面，用三个真实的 Supabase Auth 测试账号模拟「创作者 / 品牌方 / 平台运营」三种身份。
// 每次操作会用对应身份真实登录一次，所以数据库的行级权限（RLS）是真实生效的，不是摆设。
export const TEST_ACCOUNTS = {
  creator: {
    email: "creator1-test@ugc-demo.local",
    password: "Demo1234!",
    id: "c580f834-77c0-4adc-aa39-41e08538c358",
    name: "小红 · 美妆博主"
  },
  brand: {
    email: "brand-test@ugc-demo.local",
    password: "Demo1234!",
    id: "6071b1a4-b80d-42f6-97d7-7a46c1060eb4",
    name: "联合利华 · 市场部测试账号"
  },
  operator: {
    email: "operator-test@ugc-demo.local",
    password: "Demo1234!",
    id: "7b6ac783-d389-451b-be4b-7377bd7df9a0",
    name: "平台运营测试账号"
  }
} as const;

export type Role = keyof typeof TEST_ACCOUNTS;

// 保留 MOCK_USERS 这个名字，是为了让现有页面代码改动最小；但它现在指向的是真实账号的 UUID，
// 不再是随便编的字符串。
export const MOCK_USERS = {
  creator: TEST_ACCOUNTS.creator.id,
  brand: TEST_ACCOUNTS.brand.id,
  operator: TEST_ACCOUNTS.operator.id
};

/**
 * 用指定身份「真实登录」一次 Supabase，拿到一个已认证的客户端。
 * 这样数据库里的行级权限策略（RLS）能正常校验身份，而不是绕过权限直接读写。
 */
export async function getSupabaseForRole(role: Role) {
  const account = TEST_ACCOUNTS[role];
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password
  });

  if (error) {
    throw new Error(`测试账号登录失败（${role}）：${error.message}`);
  }

  return supabase;
}
