"""
AI引擎：负责所有 LLM 调用。
- 主模型：DeepSeek Chat
- 备用模型：通义千问（Qwen）
- 无 API key 时：返回 mock 数据（开发模式）
"""
import json
import re
import logging
from typing import Optional
from openai import AsyncOpenAI, APIError, RateLimitError
from config import settings

logger = logging.getLogger(__name__)

# AI腔检测模式词
CLICHE_PATTERNS = [
    r"当然[，,]", r"首先[，,]", r"总结一下", r"值得注意的是",
    r"不得不说", r"在这个.*的时代", r"作为一个.*[，,]我",
    r"我们每个人都", r"毋庸置疑", r"不可否认",
]


def _detect_cliches(text: str) -> list[str]:
    found = []
    for p in CLICHE_PATTERNS:
        if re.search(p, text):
            found.append(p)
    return found


def _get_primary_client() -> Optional[AsyncOpenAI]:
    if not settings.deepseek_api_key:
        return None
    return AsyncOpenAI(api_key=settings.deepseek_api_key, base_url=settings.deepseek_base_url)


def _get_fallback_client() -> Optional[AsyncOpenAI]:
    if not settings.qwen_api_key:
        return None
    return AsyncOpenAI(api_key=settings.qwen_api_key, base_url=settings.qwen_base_url)


async def _call_model(system: str, user: str, temperature: float = 0.7, max_tokens: int = 2500) -> str:
    """调用 LLM，自动 fallback，无 key 时返回 mock 占位符"""
    primary = _get_primary_client()
    fallback = _get_fallback_client()

    if settings.ai_mock_mode or (not primary and not fallback):
        return "__MOCK__"

    for client, model in [(primary, settings.deepseek_model), (fallback, settings.qwen_model)]:
        if not client:
            continue
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                temperature=temperature,
                max_tokens=max_tokens,
            )
            return resp.choices[0].message.content or ""
        except (RateLimitError, APIError) as e:
            logger.warning(f"Model {model} failed: {e}, trying fallback...")
            continue

    raise RuntimeError("所有模型均不可用，请检查 API key 配置")


def _parse_json(text: str) -> dict | list:
    """从模型输出中提取 JSON，兼容 markdown 代码块"""
    text = text.strip()
    # 去掉 ```json ... ``` 包裹
    text = re.sub(r"^```(?:json)?\s*", "", text)
    text = re.sub(r"\s*```$", "", text)
    return json.loads(text)


# ─── 1. IP 定位卡生成 ──────────────────────────────────────────────────────────
async def generate_profile_summary(profile_data: dict) -> str:
    system = """你是一个个人IP定位顾问。根据用户填写的信息，用简洁、有力的语言生成一张IP定位卡。
定位卡要让用户感受到「被理解」——它应该准确概括用户是谁、帮谁、解决什么，以及他的差异化所在。
语言要自然，像一个了解用户的朋友写的，不要有商业腔或模板感。"""

    user = f"""用户信息：
领域：{profile_data.get('domain', '未填写')}
身份：{profile_data.get('identity', '未填写')}
目标受众：{json.dumps(profile_data.get('core_audience', {}), ensure_ascii=False)}
解决的问题：{profile_data.get('solve_problem', '未填写')}
独特观点：{profile_data.get('unique_opinion', '未填写')}
表达风格：{', '.join(profile_data.get('tone_tags', []))}
变现目标：{profile_data.get('monetization_goal', '未填写')}
一句话被记住：{profile_data.get('tagline', '未填写')}

请生成一张IP定位卡，格式：
【你的IP定位】（2-3句话，描述你是谁、帮谁、怎么帮）
【你应该被记住的一句话】（tagline，如果用户没填则基于信息生成一个）
【你的核心受众】（1句话）
【你的内容风格】（3-4个关键词）"""

    result = await _call_model(system, user, temperature=0.6, max_tokens=400)
    if result == "__MOCK__":
        return f"""【你的IP定位】
面向{profile_data.get('core_audience', {}).get('description', '目标受众')}，分享{profile_data.get('domain', '你的专业领域')}的实践经验，帮助他们{profile_data.get('solve_problem', '解决核心问题')}。

【你应该被记住的一句话】
{profile_data.get('tagline', '用真实经验，帮你走更少弯路。')}

【你的核心受众】
{profile_data.get('core_audience', {}).get('description', '正在探索的人群')}

【你的内容风格】
{', '.join(profile_data.get('tone_tags', ['知识干货', '真实案例']))}"""
    return result


# ─── 2. 内容栏目生成 ────────────────────────────────────────────────────────────
async def generate_columns(profile_data: dict) -> list[dict]:
    system = """你是一个个人IP内容策略顾问。根据用户的IP画像，为他设计3-5个适合长期运营的内容栏目。
每个栏目要有清晰的定位和目标，且三类内容（认知/信任/转化）要有合理分布。
栏目名要简洁有辨识度，让粉丝一看就知道这个栏目给他什么价值。"""

    user = f"""IP画像：
领域：{profile_data.get('domain')}
身份：{profile_data.get('identity')}
目标受众：{json.dumps(profile_data.get('core_audience', {}), ensure_ascii=False)}
变现目标：{profile_data.get('monetization_goal')}
风格：{', '.join(profile_data.get('tone_tags', []))}

请生成3-5个内容栏目，以JSON数组返回：
[{{
  "name": "栏目名（5字以内）",
  "description": "栏目简介（1句话）",
  "goal": "这个栏目的目标",
  "frequency": "建议发布频率",
  "content_type": "awareness|trust|conversion"
}}]"""

    result = await _call_model(system, user, temperature=0.7, max_tokens=800)
    if result == "__MOCK__":
        domain = profile_data.get('domain', '你的领域')
        return [
            {"name": "避坑指南", "description": f"分享{domain}中的常见误区", "goal": "建立专业权威", "frequency": "每周1条", "content_type": "awareness"},
            {"name": "每周方法", "description": "一个可执行的具体方法", "goal": "提供收藏价值", "frequency": "每周1条", "content_type": "trust"},
            {"name": "真实复盘", "description": "真实案例和经验教训", "goal": "建立信任感", "frequency": "每两周1条", "content_type": "trust"},
            {"name": "答疑时间", "description": "回答目标受众的具体问题", "goal": "服务核心人群", "frequency": "不定期", "content_type": "awareness"},
            {"name": "合作入口", "description": "介绍服务和合作方式", "goal": "轻转化", "frequency": "每月1条", "content_type": "conversion"},
        ]
    try:
        return _parse_json(result)
    except Exception:
        logger.error(f"Column JSON parse failed: {result[:200]}")
        return []


# ─── 3. 选题推荐 ─────────────────────────────────────────────────────────────
TOPIC_POOL = [
    {"id": "t001", "title": "刚开始学AI，不知道从哪里入手", "domain_tags": ["AI", "效率", "职场"], "audience_tags": ["新手", "职场人"]},
    {"id": "t002", "title": "副业失败的真实原因", "domain_tags": ["副业", "创业"], "audience_tags": ["职场人", "创业者"]},
    {"id": "t003", "title": "我用了三个月才弄明白的一件事", "domain_tags": ["通用"], "audience_tags": ["所有人"]},
    {"id": "t004", "title": "被问了100次的问题，我来统一回答", "domain_tags": ["通用"], "audience_tags": ["所有人"]},
    {"id": "t005", "title": "真实经历：做对了什么/做错了什么", "domain_tags": ["通用"], "audience_tags": ["所有人"]},
    {"id": "t006", "title": "工具推荐：我每天都在用的X个东西", "domain_tags": ["效率", "AI", "工具"], "audience_tags": ["职场人", "学生"]},
    {"id": "t007", "title": "新手最容易踩的X个坑", "domain_tags": ["通用"], "audience_tags": ["新手"]},
    {"id": "t008", "title": "一个反常识的观点：关于XXX我和大多数人想法不同", "domain_tags": ["通用"], "audience_tags": ["所有人"]},
    {"id": "t009", "title": "从0到1的真实过程", "domain_tags": ["通用", "创业", "副业"], "audience_tags": ["创业者", "职场人"]},
    {"id": "t010", "title": "我花了多少钱/时间才学会这件事", "domain_tags": ["通用"], "audience_tags": ["所有人"]},
]


async def generate_topic_recommendations(profile_data: dict, columns: list[dict]) -> list[dict]:
    system = """你是一个个人IP内容策略顾问。从话题库中，为特定创作者筛选并个性化出「适合他的选题」。

关键原则：
1. 推荐理由必须具体，结合创作者的IP特征说明为什么这个选题适合他
2. 早期账号优先推荐服务「核心受众」的选题，而不是泛流量热点
3. 将原始话题改写为符合该创作者IP语气的标题
4. 三类内容（认知/信任/转化）要有合理分布"""

    columns_str = json.dumps(columns[:5], ensure_ascii=False)
    topics_str = json.dumps(TOPIC_POOL, ensure_ascii=False)

    user = f"""创作者IP画像：
领域：{profile_data.get('domain')}
身份：{profile_data.get('identity')}
tagline：{profile_data.get('tagline')}
核心受众：{json.dumps(profile_data.get('core_audience', {}), ensure_ascii=False)}
独特观点：{profile_data.get('unique_opinion')}
风格：{', '.join(profile_data.get('tone_tags', []))}

内容栏目：{columns_str}

话题库：{topics_str}

请为该创作者筛选并个性化推荐5条最适合的选题，以JSON数组返回：
[{{
  "original_topic_id": "话题ID",
  "customized_title": "为该创作者个性化改写的标题（20字以内）",
  "reason": "推荐理由（2-3句，具体说明为什么适合这个IP）",
  "audience_tier": "core|expanded|broad",
  "column_name": "适合哪个栏目",
  "content_type": "awareness|trust|conversion",
  "platform": "universal"
}}]"""

    result = await _call_model(system, user, temperature=0.8, max_tokens=1200)
    if result == "__MOCK__":
        domain = profile_data.get('domain', '你的领域')
        col_name = columns[0]["name"] if columns else "主栏目"
        return [
            {
                "original_topic_id": "t007",
                "customized_title": f"新手做{domain}最容易踩的3个坑（我都踩过）",
                "reason": f"这个话题直击你核心受众最真实的困境。你有亲身踩坑经历，比泛泛的建议更有说服力，也能强化「真实经验分享者」的IP标签。",
                "audience_tier": "core",
                "column_name": col_name,
                "content_type": "awareness",
                "platform": "universal",
            },
            {
                "original_topic_id": "t008",
                "customized_title": f"关于{domain}，我和大多数人的想法不一样",
                "reason": f"反常识观点是你建立IP记忆点的最快方式。你有独特视角，这个选题能让目标受众记住「这个账号不一样」。",
                "audience_tier": "core",
                "column_name": columns[1]["name"] if len(columns) > 1 else col_name,
                "content_type": "awareness",
                "platform": "universal",
            },
            {
                "original_topic_id": "t005",
                "customized_title": f"我做{domain}这件事，做对了什么、做错了什么",
                "reason": f"复盘类内容是建立信任最有效的形式。你的真实经历就是最好的素材，粉丝会因为你的坦诚而选择信任你。",
                "audience_tier": "core",
                "column_name": columns[2]["name"] if len(columns) > 2 else col_name,
                "content_type": "trust",
                "platform": "universal",
            },
            {
                "original_topic_id": "t003",
                "customized_title": f"做了3个月才想明白的一件事（关于{domain}）",
                "reason": f"「时间换来的认知」类内容容易被收藏和转发。适合你目前的账号阶段，也容易引发新手共鸣。",
                "audience_tier": "expanded",
                "column_name": col_name,
                "content_type": "awareness",
                "platform": "universal",
            },
            {
                "original_topic_id": "t004",
                "customized_title": f"大家问我最多的问题，统一来回答一下",
                "reason": f"答疑类内容一举两得：显示你账号有互动、有受众，同时为新来的粉丝建立「这个人愿意帮我」的印象。等有了一定内容积累后发效果最好。",
                "audience_tier": "core",
                "column_name": columns[3]["name"] if len(columns) > 3 else col_name,
                "content_type": "trust",
                "platform": "universal",
            },
        ]
    try:
        return _parse_json(result)
    except Exception:
        logger.error(f"Topic JSON parse failed: {result[:200]}")
        return []


# ─── 4. 一键成稿 ──────────────────────────────────────────────────────────────
async def generate_content(
    profile_data: dict,
    topic_title: str,
    column: Optional[dict],
    materials: list[dict],
    platform: str = "universal",
) -> dict:
    material_str = ""
    if materials:
        material_str = "可用素材（请至少引用一条）：\n" + "\n".join(
            f"- [{m['type']}] {m.get('title', '')}: {m['content'][:200]}" for m in materials[:3]
        )

    platform_guide = {
        "xiaohongshu": "小红书图文笔记（500-800字，多分段，情绪化标题，标签丰富）",
        "douyin": "抖音口播脚本（300-500字，前3秒有钩子，节奏快，口语化）",
        "wechat": "微信公众号文章（800-1200字，有叙事感，结尾引导关注）",
        "universal": "通用图文内容（500-800字，结构清晰，适合多平台发布）",
    }.get(platform, "通用图文内容（500-800字）")

    system = f"""你是一个帮助个人创作者生成符合自身IP风格内容的专业写手。
你生成的内容必须像「这个人自己写的」，不是AI模板。

严格禁止：
- 「当然」「首先」「总结一下」「值得注意的是」「不得不说」
- 「在这个XXX的时代」「作为一个XXX」「我们每个人都」
- 任何感叹号结尾的空洞鼓励句
- 没有具体细节的泛泛而谈

必须做到：
- 有具体场景、数字、案例或亲身经历
- 语言自然口语，像朋友聊天
- 每段不超过4句话
- 结尾有一个具体的互动引导（问题或邀请）
- 平台规范：{platform_guide}"""

    style = profile_data.get('style_memory') or {}
    column_info = f"所属栏目：{column['name']}（目标：{column.get('goal', '')}）" if column else ""

    user = f"""创作者IP信息：
领域：{profile_data.get('domain')}
身份：{profile_data.get('identity')}
tagline：{profile_data.get('tagline')}
核心受众：{json.dumps(profile_data.get('core_audience', {}), ensure_ascii=False)}
风格：{', '.join(profile_data.get('tone_tags', []))}
独特观点：{profile_data.get('unique_opinion')}

{column_info}

{material_str}

选题：{topic_title}

请生成内容，以JSON返回：
{{
  "title_variants": ["标题1（20字内，有场景/数字）", "标题2", "标题3"],
  "body": "正文内容（纯文本，用\\n换行）",
  "cover_copy": "封面文案（15字内，抓眼球）",
  "hashtags": ["标签1", "标签2", "标签3", "标签4", "标签5"],
  "comment_hook": "评论区互动引导（1句话，引导评论或提问）"
}}"""

    result = await _call_model(system, user, temperature=0.75, max_tokens=2000)
    if result == "__MOCK__":
        return {
            "title_variants": [
                f"我做{profile_data.get('domain', '这件事')}踩的坑，你别再踩了",
                f"花了半年才想明白的事（关于{profile_data.get('domain', '这件事')}）",
                f"新手必看：{topic_title}",
            ],
            "body": f"""说一件真实发生在我身上的事。

刚开始做{profile_data.get('domain', '这个领域')}的时候，我以为最难的是技术/知识层面的东西。后来才发现，最难的根本不是这个。

真正卡住我的，是不知道从哪里开始。每次打开页面，脑子里有100个想法，但就是不知道先动哪个。

后来我发现一个方法：不要想「怎么做好」，先想「做完一件」。

具体来说，就是{topic_title}。步骤很简单：
1. 先选一个最小的切口
2. 只用一个工具/方法把它跑通
3. 跑通之后再想优化

听起来很普通，但我知道大多数人——包括我自己——都在第一步就卡住了。

你有没有遇到过类似的情况？评论区聊聊。""",
            "cover_copy": f"关于{profile_data.get('domain', '这件事')}的真话",
            "hashtags": [profile_data.get('domain', '个人成长'), "经验分享", "新手必看", "真实案例", "避坑指南"],
            "comment_hook": "你做这件事卡在哪一步了？评论区说说，我来帮你想想。",
        }
    try:
        return _parse_json(result)
    except Exception:
        logger.error(f"Content JSON parse failed: {result[:200]}")
        return {"title_variants": [topic_title], "body": result, "cover_copy": "", "hashtags": [], "comment_hook": ""}


# ─── 5. 风格提取 ──────────────────────────────────────────────────────────────
async def extract_style_memory(contents: list[str]) -> dict:
    system = """你是一个写作风格分析专家。分析以下内容的写作风格特征，提取可用于后续内容生成约束的结构化特征。"""

    samples = "\n\n---\n\n".join(f"【样本{i+1}】\n{c[:500]}" for i, c in enumerate(contents[:5]))
    user = f"""以下是创作者已发布的内容：

{samples}

请提取风格特征，以JSON返回：
{{
  "avg_sentence_length": 平均句子字数（数字）,
  "common_patterns": ["常用句式模式1", "常用句式模式2"],
  "punctuation_style": "标点使用风格描述",
  "opening_patterns": ["开头习惯1", "开头习惯2"],
  "structure_preference": "内容结构描述",
  "emoji_usage": "none|low|medium|high",
  "tone_descriptors": ["风格词1", "风格词2", "风格词3"],
  "forbidden_patterns": ["应避免的AI腔模式词1", "模式词2"]
}}"""

    result = await _call_model(system, user, temperature=0.3, max_tokens=600)
    if result == "__MOCK__":
        return {
            "avg_sentence_length": 22,
            "common_patterns": ["X不是Y，而是Z", "我不建议...", "真实情况是..."],
            "punctuation_style": "多用句号，偶尔用省略号，少用感叹号",
            "opening_patterns": ["直接描述场景", "以一个问题开头"],
            "structure_preference": "问题-原因-解法",
            "emoji_usage": "low",
            "tone_descriptors": ["直接", "真实", "干货"],
            "forbidden_patterns": ["当然，", "总结来说", "值得注意的是"],
        }
    try:
        return _parse_json(result)
    except Exception:
        logger.error(f"Style extract JSON parse failed: {result[:200]}")
        return {}


# ─── 6. 复盘分析 ──────────────────────────────────────────────────────────────
async def analyze_review(profile_data: dict, content_summary: str, review_data: dict) -> dict:
    system = """你是一个个人IP内容增长顾问。根据创作者的内容表现数据，给出具体、可执行的建议。
避免空洞建议，要结合数据说话。"""

    user = f"""创作者IP：{profile_data.get('tagline')}
内容摘要：{content_summary[:200]}

表现数据：
- 浏览：{review_data.get('views', 0)}
- 点赞：{review_data.get('likes', 0)}
- 收藏：{review_data.get('saves', 0)}
- 评论：{review_data.get('comments', 0)}
- 涨粉：{review_data.get('new_followers', 0)}
- 带来咨询：{'是' if review_data.get('led_to_inquiry') else '否'}

请以JSON返回分析结果：
{{
  "performance_level": "excellent|good|average|poor",
  "key_insight": "一句话核心发现",
  "best_performing_aspect": "表现最好的方面",
  "next_topic_hints": ["下一步选题建议1", "建议2"],
  "column_advice": "对这个栏目的建议",
  "conversion_readiness": "是否可以开始引导转化（是/否+理由）",
  "platform_suggestion": "是否值得改写到其他平台"
}}"""

    result = await _call_model(system, user, temperature=0.4, max_tokens=500)
    if result == "__MOCK__":
        saves = review_data.get('saves', 0)
        level = "good" if saves > 50 else "average"
        return {
            "performance_level": level,
            "key_insight": "收藏率是这条内容表现的核心指标，说明内容有实用价值",
            "best_performing_aspect": "标题吸引了点击，内容留住了收藏",
            "next_topic_hints": ["可以做一个更具体的案例版本", "试试把这个话题改写成「避坑」角度"],
            "column_advice": "这个栏目值得继续，方向是对的",
            "conversion_readiness": "再发2-3条同类内容后可以开始轻引导",
            "platform_suggestion": "这条内容适合改写到微信公众号，篇幅和内容深度刚好合适",
        }
    try:
        return _parse_json(result)
    except Exception:
        return {}
