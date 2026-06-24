import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = join(process.cwd(), "prisma", "dev.db");

if (existsSync(dbPath)) {
  unlinkSync(dbPath);
}

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
PRAGMA foreign_keys = ON;

CREATE TABLE User (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE CreatorProfile (
  id TEXT NOT NULL PRIMARY KEY,
  userId TEXT NOT NULL UNIQUE,
  displayName TEXT NOT NULL,
  location TEXT NOT NULL,
  interests TEXT NOT NULL,
  platforms TEXT NOT NULL,
  followerCount INTEGER NOT NULL,
  contentStyle TEXT NOT NULL,
  contact TEXT,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT CreatorProfile_userId_fkey FOREIGN KEY (userId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Campaign (
  id TEXT NOT NULL PRIMARY KEY,
  brandId TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  requirements TEXT NOT NULL,
  rewardText TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT '小红书',
  category TEXT NOT NULL DEFAULT '种草内容',
  quota INTEGER NOT NULL DEFAULT 50,
  rewardAmount REAL NOT NULL DEFAULT 100,
  allowImageText BOOLEAN NOT NULL DEFAULT true,
  allowVideo BOOLEAN NOT NULL DEFAULT true,
  imageTextBrief TEXT NOT NULL DEFAULT '查看品牌文案和拍摄要求，完成仿拍后提交照片和文案给品牌审核。',
  imageTextCopy TEXT NOT NULL DEFAULT '请结合个人真实体验，发布一篇自然、真实的小红书图文笔记。',
  videoBrief TEXT NOT NULL DEFAULT '查看拍摄要求后上传原始视频素材，由运营制作数字人/混剪内容。',
  videoCopy TEXT NOT NULL DEFAULT '请领取平台制作完成的视频和文案后发布到小红书。',
  aiPrecheckStatus TEXT NOT NULL DEFAULT 'not_connected',
  status TEXT NOT NULL DEFAULT 'recruiting',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT Campaign_brandId_fkey FOREIGN KEY (brandId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE CampaignQuestion (
  id TEXT NOT NULL PRIMARY KEY,
  campaignId TEXT NOT NULL,
  title TEXT NOT NULL,
  required BOOLEAN NOT NULL DEFAULT true,
  sortOrder INTEGER NOT NULL DEFAULT 0,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT CampaignQuestion_campaignId_fkey FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Application (
  id TEXT NOT NULL PRIMARY KEY,
  campaignId TEXT NOT NULL,
  creatorId TEXT NOT NULL,
  name TEXT NOT NULL,
  socialPlatform TEXT NOT NULL,
  socialHandle TEXT NOT NULL,
  followerCount INTEGER NOT NULL,
  pitch TEXT NOT NULL,
  selectedNoteType TEXT,
  status TEXT NOT NULL DEFAULT 'pending_brand_review',
  brandReviewNote TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT Application_campaignId_fkey FOREIGN KEY (campaignId) REFERENCES Campaign (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT Application_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ApplicationAnswer (
  id TEXT NOT NULL PRIMARY KEY,
  applicationId TEXT NOT NULL,
  questionId TEXT NOT NULL,
  answer TEXT NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ApplicationAnswer_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES Application (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ApplicationAnswer_questionId_fkey FOREIGN KEY (questionId) REFERENCES CampaignQuestion (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE MaterialSubmission (
  id TEXT NOT NULL PRIMARY KEY,
  applicationId TEXT NOT NULL,
  creatorId TEXT NOT NULL,
  noteType TEXT NOT NULL DEFAULT 'video',
  fileUrl TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_operator_review',
  operatorReviewNote TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT MaterialSubmission_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES Application (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT MaterialSubmission_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ContentTask (
  id TEXT NOT NULL PRIMARY KEY,
  applicationId TEXT NOT NULL,
  materialSubmissionId TEXT UNIQUE,
  operatorId TEXT,
  status TEXT NOT NULL DEFAULT 'waiting',
  note TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT ContentTask_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES Application (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ContentTask_materialSubmissionId_fkey FOREIGN KEY (materialSubmissionId) REFERENCES MaterialSubmission (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ProducedContent (
  id TEXT NOT NULL PRIMARY KEY,
  applicationId TEXT NOT NULL,
  materialSubmissionId TEXT,
  operatorId TEXT,
  contentType TEXT NOT NULL DEFAULT 'video',
  source TEXT NOT NULL DEFAULT 'operator',
  fileUrl TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_brand_final_review',
  brandReviewNote TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT ProducedContent_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES Application (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ProducedContent_materialSubmissionId_fkey FOREIGN KEY (materialSubmissionId) REFERENCES MaterialSubmission (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ProducedContent_operatorId_fkey FOREIGN KEY (operatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ContentClaim (
  id TEXT NOT NULL PRIMARY KEY,
  producedContentId TEXT NOT NULL UNIQUE,
  creatorId TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimed',
  claimedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ContentClaim_producedContentId_fkey FOREIGN KEY (producedContentId) REFERENCES ProducedContent (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT ContentClaim_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE PublishProof (
  id TEXT NOT NULL PRIMARY KEY,
  producedContentId TEXT NOT NULL UNIQUE,
  creatorId TEXT NOT NULL,
  postUrl TEXT NOT NULL,
  screenshotUrl TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  submittedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT PublishProof_producedContentId_fkey FOREIGN KEY (producedContentId) REFERENCES ProducedContent (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT PublishProof_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE Payment (
  id TEXT NOT NULL PRIMARY KEY,
  applicationId TEXT NOT NULL UNIQUE,
  producedContentId TEXT UNIQUE,
  creatorId TEXT NOT NULL,
  amount REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  note TEXT,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL,
  CONSTRAINT Payment_applicationId_fkey FOREIGN KEY (applicationId) REFERENCES Application (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT Payment_producedContentId_fkey FOREIGN KEY (producedContentId) REFERENCES ProducedContent (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT Payment_creatorId_fkey FOREIGN KEY (creatorId) REFERENCES User (id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX Campaign_brandId_idx ON Campaign (brandId);
CREATE INDEX CampaignQuestion_campaignId_idx ON CampaignQuestion (campaignId);
CREATE INDEX Application_campaignId_idx ON Application (campaignId);
CREATE INDEX Application_creatorId_idx ON Application (creatorId);
CREATE INDEX ApplicationAnswer_applicationId_idx ON ApplicationAnswer (applicationId);
CREATE INDEX MaterialSubmission_applicationId_idx ON MaterialSubmission (applicationId);
CREATE INDEX ProducedContent_applicationId_idx ON ProducedContent (applicationId);
CREATE INDEX Payment_creatorId_idx ON Payment (creatorId);
`);

db.close();
console.log(`Created SQLite database at ${dbPath}`);
