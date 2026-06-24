import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.publishProof.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.contentClaim.deleteMany();
  await prisma.producedContent.deleteMany();
  await prisma.contentTask.deleteMany();
  await prisma.materialSubmission.deleteMany();
  await prisma.applicationAnswer.deleteMany();
  await prisma.application.deleteMany();
  await prisma.campaignQuestion.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.user.deleteMany();

  await prisma.user.createMany({
    data: [
      {
        id: "creator_alice",
        name: "Alice 创作者",
        email: "alice@example.com",
        role: "creator"
      },
      {
        id: "brand_demo",
        name: "Demo Brand",
        email: "brand@example.com",
        role: "brand"
      },
      {
        id: "operator_ops",
        name: "Ops User",
        email: "ops@example.com",
        role: "operator"
      }
    ]
  });

  await prisma.creatorProfile.create({
    data: {
      userId: "creator_alice",
      displayName: "Alice 小红书创作者",
      location: "纽约",
      interests: "咖啡、护肤、校园生活、真实测评",
      platforms: "小红书、TikTok、Instagram",
      followerCount: 12000,
      contentStyle: "自然生活方式种草，适合短视频与图文笔记",
      contact: "alice@example.com"
    }
  });

  await prisma.campaign.create({
    data: {
      id: "campaign_skincare",
      brandId: "brand_demo",
      title: "夏日护肤种草任务",
      description: "邀请北美创作者围绕夏季护肤流程产出真实生活化种草内容。",
      requirements: "上传 2 条原始视频素材和 3 张生活方式照片，建议自然光拍摄。",
      rewardText: "成品发布并提交证明后结算 ¥150。",
      platform: "小红书",
      category: "护肤种草",
      quota: 50,
      rewardAmount: 150,
      allowImageText: true,
      allowVideo: true,
      imageTextBrief: "图文笔记：领取品牌提供的核心文案，参考拍摄要求完成仿拍。需提交 3-5 张照片和最终文案给品牌审核。",
      imageTextCopy: "夏天护肤我更喜欢清爽不粘腻的搭配，这次试用后最喜欢的是它的肤感和妆前适配度。",
      videoBrief: "视频笔记：先观看拍摄要求，上传 3-5 段原始视频素材。运营会基于素材进行数字人生成和内容混剪。",
      videoCopy: "夏日护肤流程分享：清爽、保湿、适合通勤前快速完成。",
      aiPrecheckStatus: "not_connected",
      status: "recruiting",
      questions: {
        create: [
          { title: "请描述你的肤质和日常护肤习惯", sortOrder: 1 },
          { title: "你过往是否发布过护肤相关内容？请贴链接或说明", sortOrder: 2 },
          { title: "你计划用什么场景呈现这次内容？", sortOrder: 3 }
        ]
      }
    }
  });

  await prisma.campaign.create({
    data: {
      id: "campaign_coffee",
      brandId: "brand_demo",
      title: "冷萃咖啡新品推广",
      description: "创作者分享早晨冷萃咖啡饮用场景和真实体验。",
      requirements: "上传 1 条 30-60 秒竖版视频原素材，可附加封面图。",
      rewardText: "成品发布并提交证明后结算 ¥100。",
      platform: "TikTok",
      category: "饮品测评",
      quota: 80,
      rewardAmount: 100,
      allowImageText: true,
      allowVideo: true,
      imageTextBrief: "图文笔记：拍摄早餐、通勤或学习场景，提交 3 张照片和种草文案给品牌审核。",
      imageTextCopy: "最近早八/通勤前会喝这款冷萃，口感干净，适合喜欢低负担咖啡的人。",
      videoBrief: "视频笔记：上传开瓶、饮用、生活方式场景原始视频，运营负责混剪成小红书视频。",
      videoCopy: "冷萃咖啡新品体验：适合早晨快速出门，也适合下午低负担提神。",
      aiPrecheckStatus: "not_connected",
      status: "recruiting",
      questions: {
        create: [
          { title: "你平时发布哪些饮品或生活方式内容？", sortOrder: 1 },
          { title: "你希望如何拍摄冷萃咖啡的使用场景？", sortOrder: 2 }
        ]
      }
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
