export const statusLabel: Record<string, string> = {
  draft: "草稿",
  published: "已发布",
  recruiting: "招募中",
  recruitment_closed: "招募结束",
  content_production: "内容生产中",
  publishing: "发布中",
  settlement: "结算中",
  completed: "已完成",
  not_connected: "待接入",
  pending: "待处理",
  passed: "已通过",
  failed: "未通过",
  pending_brand_review: "品牌审核中",
  approved: "审核通过",
  rejected: "审核拒绝",
  pending_operator_review: "运营审核中",
  pending_brand_final_review: "品牌终审中",
  waiting: "待制作",
  in_progress: "制作中",
  submitted: "已提交",
  claimed: "已领取",
  pending_review: "待审核",
  reviewing: "审核中",
  confirmed: "已确认",
  paid: "已打款"
};

export function labelStatus(status: string) {
  return statusLabel[status] ?? status;
}
