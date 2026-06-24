"use server";

import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSupabaseForRole, MOCK_USERS } from "@/lib/supabase";

async function saveUploadedFile(file: File | null, folder: string) {
  if (!file || file.size === 0) {
    return null;
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
  await mkdir(uploadDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filename = `${Date.now()}-${randomUUID()}-${safeName}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), bytes);

  return `/uploads/${folder}/${filename}`;
}

export async function createApplication(formData: FormData) {
  const campaignId = String(formData.get("campaignId"));
  const supabase = await getSupabaseForRole("creator");

  const { data: campaign, error: campaignError } = await supabase
    .from("campaigns")
    .select("id, reward_amount, campaign_questions(id)")
    .eq("id", campaignId)
    .single();

  if (campaignError || !campaign) {
    throw new Error("活动不存在。");
  }

  const { data: application, error: applicationError } = await supabase
    .from("applications")
    .insert({
      campaign_id: campaignId,
      creator_id: MOCK_USERS.creator,
      name: String(formData.get("name")),
      social_platform: String(formData.get("socialPlatform")),
      social_handle: String(formData.get("socialHandle")),
      follower_count: Number(formData.get("followerCount") || 0),
      pitch: String(formData.get("pitch"))
    })
    .select("id")
    .single();

  if (applicationError || !application) {
    throw new Error(`报名提交失败：${applicationError?.message}`);
  }

  const questions = (campaign.campaign_questions ?? []) as { id: string }[];
  if (questions.length > 0) {
    const { error: answersError } = await supabase.from("application_answers").insert(
      questions.map((question) => ({
        application_id: application.id,
        question_id: question.id,
        answer: String(formData.get(`question_${question.id}`) || "")
      }))
    );
    if (answersError) {
      throw new Error(`问卷保存失败：${answersError.message}`);
    }
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    application_id: application.id,
    creator_id: MOCK_USERS.creator,
    amount: campaign.reward_amount,
    status: "pending_review",
    note: "报名后自动生成的结算占位记录，发布证明提交后由品牌方确认。"
  });

  if (paymentError) {
    throw new Error(`结算记录创建失败：${paymentError.message}`);
  }

  revalidatePath("/");
  redirect("/creator/applications");
}

export async function updateCreatorProfile(formData: FormData) {
  const supabase = await getSupabaseForRole("creator");

  const { error } = await supabase.from("creator_profiles").upsert(
    {
      user_id: MOCK_USERS.creator,
      display_name: String(formData.get("displayName")),
      location: String(formData.get("location")),
      interests: String(formData.get("interests")),
      platforms: String(formData.get("platforms")),
      follower_count: Number(formData.get("followerCount") || 0),
      content_style: String(formData.get("contentStyle")),
      contact: String(formData.get("contact") || "")
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`资料保存失败：${error.message}`);
  }

  revalidatePath("/creator/profile");
}

export async function createCampaign(formData: FormData) {
  const questions = String(formData.get("questions") || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const supabase = await getSupabaseForRole("brand");

  const { data: campaign, error } = await supabase
    .from("campaigns")
    .insert({
      brand_id: MOCK_USERS.brand,
      title: String(formData.get("title")),
      description: String(formData.get("description")),
      requirements: String(formData.get("requirements")),
      reward_text: String(formData.get("rewardText")),
      platform: String(formData.get("platform")),
      category: String(formData.get("category")),
      quota: Number(formData.get("quota") || 0),
      reward_amount: Number(formData.get("rewardAmount") || 0),
      allow_image_text: formData.get("allowImageText") === "on",
      allow_video: formData.get("allowVideo") === "on",
      image_text_brief: String(formData.get("imageTextBrief") || "查看品牌文案和拍摄要求，完成仿拍后提交照片和文案给品牌审核。"),
      image_text_copy: String(formData.get("imageTextCopy") || "请结合个人真实体验，发布一篇自然、真实的小红书图文笔记。"),
      video_brief: String(formData.get("videoBrief") || "查看拍摄要求后上传原始视频素材，由运营制作数字人/混剪内容。"),
      video_copy: String(formData.get("videoCopy") || "请领取平台制作完成的视频和文案后发布到小红书。"),
      status: "recruiting",
      ai_precheck_status: "not_connected"
    })
    .select("id")
    .single();

  if (error || !campaign) {
    throw new Error(`活动创建失败：${error?.message}`);
  }

  if (questions.length > 0) {
    const { error: questionsError } = await supabase.from("campaign_questions").insert(
      questions.map((title, index) => ({
        campaign_id: campaign.id,
        title,
        sort_order: index + 1
      }))
    );
    if (questionsError) {
      throw new Error(`问卷保存失败：${questionsError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/brand/campaigns");
}

export async function updateCampaignWorkflow(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await getSupabaseForRole("brand");

  const { error } = await supabase
    .from("campaigns")
    .update({
      allow_image_text: formData.get("allowImageText") === "on",
      allow_video: formData.get("allowVideo") === "on",
      image_text_brief: String(formData.get("imageTextBrief") || ""),
      image_text_copy: String(formData.get("imageTextCopy") || ""),
      video_brief: String(formData.get("videoBrief") || ""),
      video_copy: String(formData.get("videoCopy") || "")
    })
    .eq("id", id);

  if (error) {
    throw new Error(`流程保存失败：${error.message}`);
  }

  revalidatePath("/brand/content-workflows");
  redirect("/brand/content-workflows");
}

export async function selectApplicationNoteType(formData: FormData) {
  const id = String(formData.get("id"));
  const selectedNoteType = String(formData.get("selectedNoteType")) as "image_text" | "video";
  const supabase = await getSupabaseForRole("creator");

  const { error } = await supabase
    .from("applications")
    .update({ selected_note_type: selectedNoteType })
    .eq("id", id);

  if (error) {
    throw new Error(`选择失败：${error.message}`);
  }

  revalidatePath("/creator/content-production");
  redirect("/creator/content-production");
}

async function reviewApplicationWithStatus(formData: FormData, status: "approved" | "rejected") {
  const id = String(formData.get("id"));
  const supabase = await getSupabaseForRole("brand");

  const { error } = await supabase
    .from("applications")
    .update({
      status,
      brand_review_note: String(formData.get("brandReviewNote") || "")
    })
    .eq("id", id);

  if (error) {
    throw new Error(`审核失败：${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/brand/applications");
  redirect("/brand/applications");
}

export async function approveApplication(formData: FormData) {
  await reviewApplicationWithStatus(formData, "approved");
}

export async function rejectApplication(formData: FormData) {
  await reviewApplicationWithStatus(formData, "rejected");
}

export async function submitMaterial(formData: FormData) {
  return submitVideoMaterial(formData);
}

export async function submitVideoMaterial(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const fileUrl = await saveUploadedFile(formData.get("file") as File | null, "materials");

  if (!fileUrl) {
    throw new Error("Please upload a material file.");
  }

  const supabase = await getSupabaseForRole("creator");
  const { error } = await supabase.from("material_submissions").insert({
    application_id: applicationId,
    creator_id: MOCK_USERS.creator,
    note_type: "video",
    file_url: fileUrl,
    description: String(formData.get("description"))
  });

  if (error) {
    throw new Error(`素材提交失败：${error.message}`);
  }

  revalidatePath("/");
  redirect("/creator/content-production");
}

export async function submitImageTextContent(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const fileUrl = await saveUploadedFile(formData.get("file") as File | null, "image-text");

  if (!fileUrl) {
    throw new Error("请上传图文照片文件。");
  }

  const supabase = await getSupabaseForRole("creator");
  const { error } = await supabase.from("produced_contents").insert({
    application_id: applicationId,
    content_type: "image_text",
    source: "creator",
    file_url: fileUrl,
    description: String(formData.get("description"))
  });

  if (error) {
    throw new Error(`内容提交失败：${error.message}`);
  }

  revalidatePath("/");
  redirect("/creator/content-production");
}

async function reviewMaterialWithStatus(formData: FormData, status: "approved" | "rejected") {
  const id = String(formData.get("id"));
  const supabase = await getSupabaseForRole("operator");

  const { data: material, error } = await supabase
    .from("material_submissions")
    .update({
      status,
      operator_review_note: String(formData.get("operatorReviewNote") || "")
    })
    .eq("id", id)
    .select("id, application_id")
    .single();

  if (error || !material) {
    throw new Error(`审核失败：${error?.message}`);
  }

  if (status === "approved") {
    const { error: taskError } = await supabase.from("content_tasks").upsert(
      {
        application_id: material.application_id,
        material_submission_id: material.id,
        operator_id: MOCK_USERS.operator,
        status: "waiting",
        note: "素材审核通过，等待制作。"
      },
      { onConflict: "material_submission_id" }
    );
    if (taskError) {
      throw new Error(`制作任务创建失败：${taskError.message}`);
    }
  }

  revalidatePath("/");
  revalidatePath("/operator/material-reviews");
  redirect("/operator/material-reviews");
}

export async function approveMaterial(formData: FormData) {
  await reviewMaterialWithStatus(formData, "approved");
}

export async function rejectMaterial(formData: FormData) {
  await reviewMaterialWithStatus(formData, "rejected");
}

export async function uploadProducedContent(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const materialSubmissionId = String(formData.get("materialSubmissionId"));
  const fileUrl = await saveUploadedFile(formData.get("file") as File | null, "produced");

  if (!fileUrl) {
    throw new Error("Please upload a produced content file.");
  }

  const supabase = await getSupabaseForRole("operator");

  const { error } = await supabase.from("produced_contents").insert({
    application_id: applicationId,
    material_submission_id: materialSubmissionId,
    operator_id: MOCK_USERS.operator,
    content_type: "video",
    source: "operator",
    file_url: fileUrl,
    description: String(formData.get("description"))
  });

  if (error) {
    throw new Error(`成品上传失败：${error.message}`);
  }

  const { error: taskError } = await supabase
    .from("content_tasks")
    .update({
      status: "submitted",
      note: "成品已上传，等待品牌终审。"
    })
    .eq("material_submission_id", materialSubmissionId);

  if (taskError) {
    throw new Error(`制作任务状态更新失败：${taskError.message}`);
  }

  revalidatePath("/");
  redirect("/operator/content-production");
}

async function reviewProducedContentWithStatus(formData: FormData, status: "approved" | "rejected") {
  const id = String(formData.get("id"));
  const supabase = await getSupabaseForRole("brand");

  const { error } = await supabase
    .from("produced_contents")
    .update({
      status,
      brand_review_note: String(formData.get("brandReviewNote") || "")
    })
    .eq("id", id);

  if (error) {
    throw new Error(`审核失败：${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/brand/final-reviews");
  redirect("/brand/final-reviews");
}

export async function approveProducedContent(formData: FormData) {
  await reviewProducedContentWithStatus(formData, "approved");
}

export async function rejectProducedContent(formData: FormData) {
  await reviewProducedContentWithStatus(formData, "rejected");
}

export async function claimContent(formData: FormData) {
  const producedContentId = String(formData.get("producedContentId"));
  const supabase = await getSupabaseForRole("creator");

  const { error } = await supabase.from("content_claims").upsert(
    {
      produced_content_id: producedContentId,
      creator_id: MOCK_USERS.creator
    },
    { onConflict: "produced_content_id" }
  );

  if (error) {
    throw new Error(`领取失败：${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/creator/claim");
  revalidatePath("/creator/content-production");
  redirect("/creator/content-production");
}

export async function submitPublishProof(formData: FormData) {
  const producedContentId = String(formData.get("producedContentId"));
  const screenshotUrl = await saveUploadedFile(formData.get("screenshot") as File | null, "proofs");
  const supabase = await getSupabaseForRole("creator");

  const { error: proofError } = await supabase.from("publish_proofs").upsert(
    {
      produced_content_id: producedContentId,
      creator_id: MOCK_USERS.creator,
      post_url: String(formData.get("postUrl")),
      screenshot_url: screenshotUrl,
      note: String(formData.get("note") || "")
    },
    { onConflict: "produced_content_id" }
  );

  if (proofError) {
    throw new Error(`发布证明提交失败：${proofError.message}`);
  }

  const { data: content } = await supabase
    .from("produced_contents")
    .select("id, application_id")
    .eq("id", producedContentId)
    .single();

  if (content) {
    const { error: paymentError } = await supabase
      .from("payments")
      .update({
        produced_content_id: producedContentId,
        status: "reviewing",
        note: "创作者已提交发布证明，等待品牌方确认结算。"
      })
      .eq("application_id", content.application_id);

    if (paymentError) {
      throw new Error(`结算状态更新失败：${paymentError.message}`);
    }
  }

  revalidatePath("/");
  redirect("/creator/proofs");
}

async function updatePaymentWithStatus(formData: FormData, status: "confirmed" | "paid") {
  const id = String(formData.get("id"));
  const supabase = await getSupabaseForRole("operator");

  const { error } = await supabase
    .from("payments")
    .update({
      status,
      note: String(formData.get("note") || "")
    })
    .eq("id", id);

  if (error) {
    throw new Error(`结算更新失败：${error.message}`);
  }

  revalidatePath("/");
  revalidatePath("/operator/payments");
  redirect("/operator/payments");
}

export async function confirmPayment(formData: FormData) {
  await updatePaymentWithStatus(formData, "confirmed");
}

export async function markPaymentPaid(formData: FormData) {
  await updatePaymentWithStatus(formData, "paid");
}
