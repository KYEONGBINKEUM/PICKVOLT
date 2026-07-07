"""
Pickvolt 사이트용 자동 글 생성기

E:\\00. pickvolt blog\\00. pickvolt blog-lite\\blog_auto_generator.py 를 참고해서 만든 새 스크립트.
원본과 동일하게 로컬 `codex` CLI(OAuth 로그인)로 글을 생성하지만, 저장 대상을
Blogger 대신 Pickvolt 사이트(/api/articles/auto-import)로 바꿨다.

필요한 환경변수 (scripts/.env 에 저장, 이 파일은 git에 커밋되지 않음):
  PICKVOLT_API_URL         사이트 주소 (기본값: https://pickvolt.com)
  ARTICLES_IMPORT_SECRET   Vercel에 등록한 공유 시크릿 (필수)
  PICKVOLT_AUTHOR_ID       글쓴이로 표시할 Supabase auth.users UUID (필수)
                           Supabase 대시보드 > Authentication > Users 에서 확인
  PICKVOLT_AUTHOR_NAME     글쓴이 표시 이름 (선택, 기본값: "Pickvolt 테크팀")
  PEXELS_API_KEY           대표/본문 이미지 자동 삽입용 (선택, 없으면 이미지 생략)
  CHATGPT_CLI_COMMAND      codex 실행 경로 직접 지정 (선택)
  OPENAI_MODEL             codex 모델 지정 (선택)
  TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID  저장 완료 알림 (선택)

실행 전 준비:
  1. codex CLI 로그인: codex login
  2. scripts/.env.example 을 scripts/.env 로 복사 후 값 채우기
  3. python scripts/pickvolt_auto_write.py

저장은 항상 draft 로만 이루어진다. 발행은 관리자가 Pickvolt 사이트의
/articles/write 에서 초안을 검토한 뒤 직접 진행해야 한다.
"""

import io
import json
import os
import shlex
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import feedparser
import requests
from bs4 import BeautifulSoup
from ddgs import DDGS

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding="utf-8", errors="replace")


def load_dotenv_if_present() -> None:
    env_path = Path(__file__).with_name(".env")
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_dotenv_if_present()


REQUIRED_PACKAGES = {
    "feedparser": "feedparser",
    "requests": "requests",
    "ddgs": "ddgs",
    "beautifulsoup4": "bs4",
}


def install_if_missing() -> None:
    missing = []
    for pkg, import_name in REQUIRED_PACKAGES.items():
        try:
            __import__(import_name)
        except ImportError:
            missing.append(pkg)

    if not missing:
        return

    print(f"[설치] 필요한 패키지를 설치합니다: {', '.join(missing)}")
    for pkg in missing:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", pkg, "-q"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    print("[설치] 완료\n")


install_if_missing()


PICKVOLT_API_URL = os.getenv("PICKVOLT_API_URL", "https://pickvolt.com").rstrip("/")
ARTICLES_IMPORT_SECRET = os.getenv("ARTICLES_IMPORT_SECRET", "").strip()
PICKVOLT_AUTHOR_ID = os.getenv("PICKVOLT_AUTHOR_ID", "").strip()
PICKVOLT_AUTHOR_NAME = os.getenv("PICKVOLT_AUTHOR_NAME", "Pickvolt 테크팀").strip()
PEXELS_API_KEY = os.getenv("PEXELS_API_KEY", "").strip()
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "").strip()
CHATGPT_CLI_COMMAND = os.getenv("CHATGPT_CLI_COMMAND", "").strip()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "").strip()
POSTS_PER_RUN = int(os.getenv("POSTS_PER_RUN", "2"))

ARTICLE_CATEGORIES = ["tech", "it", "ai", "mobile", "review", "security", "startup"]
CATEGORY_LABELS = {
    "tech": "테크 최신",
    "it": "IT 인사이트",
    "ai": "AI 트렌드",
    "mobile": "모바일·웨어러블",
    "review": "리뷰",
    "security": "보안",
    "startup": "스타트업",
}

GOOGLE_TRENDS_KR_RSS = "https://trends.google.com/trends/trendingsearches/daily/rss?geo=KR"


def require_config() -> None:
    missing = []
    if not ARTICLES_IMPORT_SECRET:
        missing.append("ARTICLES_IMPORT_SECRET")
    if not PICKVOLT_AUTHOR_ID:
        missing.append("PICKVOLT_AUTHOR_ID")
    if missing:
        raise SystemExit(
            f"[설정 오류] scripts/.env 에 다음 값을 채워주세요: {', '.join(missing)}\n"
            "scripts/.env.example 을 참고하세요."
        )


def resolve_chatgpt_cli_command() -> list[str]:
    if CHATGPT_CLI_COMMAND:
        return shlex.split(CHATGPT_CLI_COMMAND, posix=(os.name != "nt"))

    candidates = [
        shutil.which("codex.cmd"),
        shutil.which("codex"),
    ]
    for candidate in candidates:
        if candidate:
            return [candidate]

    raise FileNotFoundError(
        "codex CLI를 찾지 못했습니다. `codex login` 후 다시 실행하거나 "
        "`CHATGPT_CLI_COMMAND` 환경변수로 경로를 지정하세요."
    )


def extract_response_text(raw_text: str) -> str:
    text = raw_text.strip()
    if "```json" in text:
        return text.split("```json", 1)[1].split("```", 1)[0].strip()
    if "```html" in text:
        return text.split("```html", 1)[1].split("```", 1)[0].strip()
    if "```" in text:
        return text.split("```", 1)[1].split("```", 1)[0].strip()
    return text


def call_chatgpt_cli(prompt: str, stage: str = "작업") -> str:
    base_cmd = resolve_chatgpt_cli_command()
    cmd = base_cmd + ["exec"]
    if OPENAI_MODEL:
        cmd += ["--model", OPENAI_MODEL]
    cmd += ["--skip-git-repo-check", "--color", "never", "-"]

    max_attempts = 3
    for attempt in range(1, max_attempts + 1):
        label = f"{stage} 요청 중..." if attempt == 1 else f"{stage} 재시도 중... ({attempt}/{max_attempts})"
        print(f"  🤖 {label}")

        result = subprocess.run(
            cmd,
            input=prompt,
            text=True,
            capture_output=True,
            encoding="utf-8",
            errors="replace",
        )
        if result.returncode == 0:
            print(f"  ✅ {stage} 완료")
            return extract_response_text(result.stdout)

        detail = (result.stderr or "").strip() or (result.stdout or "").strip()
        lowered = detail.lower()
        is_retryable = any(
            phrase in lowered
            for phrase in ["at capacity", "try a different model", "temporarily unavailable", "rate limit", "overloaded", "timeout"]
        )
        if is_retryable and attempt < max_attempts:
            wait_seconds = attempt * 5
            print(f"  ⏳ {stage} 일시 실패, {wait_seconds}초 후 자동 재시도합니다.")
            time.sleep(wait_seconds)
            continue
        raise RuntimeError(f"codex CLI 호출 실패: {detail}")

    raise RuntimeError(f"codex CLI 호출 실패: {stage} 재시도 횟수 초과")


def fetch_auto_trends(max_trends: int = 8) -> list[dict]:
    print("\n  📡 트렌드 수집 중...")
    raw_trends: list[dict] = []

    try:
        headers = {"User-Agent": "Mozilla/5.0"}
        resp = requests.get(GOOGLE_TRENDS_KR_RSS, headers=headers, timeout=10)
        feed = feedparser.parse(resp.content)
        for entry in feed.entries[:20]:
            title = entry.get("title", "")
            if title:
                raw_trends.append({"keyword": title})
    except Exception as e:
        print(f"  ⚠️ 구글 트렌드 RSS 실패: {e}")

    try:
        with DDGS() as ddgs:
            news_list = list(ddgs.news("한국 IT 테크 뉴스", region="kr-kr", max_results=15))
        for item in news_list:
            title = item.get("title", "")
            if title and not any(t["keyword"] == title for t in raw_trends):
                raw_trends.append({"keyword": title})
    except Exception as e:
        print(f"  ⚠️ DDG 뉴스 수집 실패: {e}")

    if not raw_trends:
        return []

    print(f"  ✅ 트렌드 후보 {len(raw_trends)}개 수집, 테크/IT 적합성 분석 중...")
    trend_text = "\n".join(f"{i + 1}. {item['keyword']}" for i, item in enumerate(raw_trends[:25]))
    categories = ", ".join(ARTICLE_CATEGORIES)
    prompt = f"""너는 한국 테크·IT 전문 블로그 "Pickvolt"의 편집장이다.
카테고리: {categories} ({', '.join(f"{k}={v}" for k, v in CATEGORY_LABELS.items())})

아래는 최근 트렌드/뉴스 키워드 목록이다. 이 중 Pickvolt 블로그 글감으로 적합한
테크/IT/AI/모바일/보안/스타트업 관련 항목만 골라 최대 {max_trends}개를 추천하라.
관련 없는 항목(연예/스포츠/정치 등)은 제외한다.

목록:
{trend_text}

반드시 JSON 배열만 반환:
[
  {{"keyword": "원본 키워드", "suggested_title": "블로그 글 제목", "category": "{'|'.join(ARTICLE_CATEGORIES)} 중 하나"}}
]"""
    try:
        parsed = json.loads(call_chatgpt_cli(prompt, stage="트렌드 적합성 분석"))
        return [p for p in parsed if p.get("category") in ARTICLE_CATEGORIES][:max_trends]
    except Exception as e:
        print(f"  ⚠️ 트렌드 분석 실패: {e}")
        return []


def prompt_single_topic() -> tuple[str, str]:
    print("\n주제를 직접 입력하세요.")
    print("예: 아이폰 17 프로 카메라 리뷰, 오픈소스 LLM 최신 동향\n")
    while True:
        topic = input("주제 > ").strip()
        if topic:
            break
        print("  주제를 입력해주세요.")

    print("\n카테고리를 선택하세요.")
    for i, cat in enumerate(ARTICLE_CATEGORIES, 1):
        print(f"  {i}. {cat} ({CATEGORY_LABELS[cat]})")
    while True:
        raw = input("번호 > ").strip() or "1"
        if raw.isdigit() and 1 <= int(raw) <= len(ARTICLE_CATEGORIES):
            return topic, ARTICLE_CATEGORIES[int(raw) - 1]
        print(f"  1~{len(ARTICLE_CATEGORIES)} 중에서 입력해주세요.")


def select_topics() -> list[dict]:
    print("\n┌─────────────────────────────────────────────┐")
    print("│           글 작성 방식을 선택하세요          │")
    print("├─────────────────────────────────────────────┤")
    print("│  1. 내가 입력한 주제로 바로 글 작성          │")
    print("│  2. 실시간 트렌드 먼저 보고 선택하기         │")
    print("└─────────────────────────────────────────────┘")

    choice = input("\n번호 > ").strip() or "1"
    if choice == "1":
        title, category = prompt_single_topic()
        return [{"title": title, "category": category, "summary": ""}]

    trends = fetch_auto_trends()
    if not trends:
        print("  트렌드를 가져오지 못했습니다. 직접 입력으로 전환합니다.")
        title, category = prompt_single_topic()
        return [{"title": title, "category": category, "summary": ""}]

    print("\n┌──────────────────────────────────────────────────────┐")
    print("│       🔥 지금 뜨는 트렌드 — 작성할 주제를 선택하세요  │")
    print("├──────────────────────────────────────────────────────┤")
    for i, item in enumerate(trends, 1):
        title = item.get("suggested_title", item.get("keyword", ""))[:50]
        print(f"│ {i:2}. [{item['category']:>8}] {title:<40} │")
    print("├──────────────────────────────────────────────────────┤")
    print(f"│ 예: 1 / 1,3 / 2-4 / Enter(위에서 {POSTS_PER_RUN}개)         │")
    print("└──────────────────────────────────────────────────────┘")

    while True:
        try:
            raw = input("\n주제 번호 > ").strip()
            if not raw:
                selected = list(range(1, min(POSTS_PER_RUN, len(trends)) + 1))
            elif "-" in raw and "," not in raw:
                start, end = raw.split("-")
                selected = list(range(int(start), int(end) + 1))
            else:
                selected = [int(x.strip()) for x in raw.split(",")]
            if all(1 <= n <= len(trends) for n in selected):
                break
            print(f"  1~{len(trends)} 범위로 입력해주세요.")
        except ValueError:
            print("  번호 형식으로 입력해주세요.")

    return [
        {
            "title": trends[n - 1].get("suggested_title", trends[n - 1].get("keyword", "")),
            "category": trends[n - 1]["category"],
            "summary": f"트렌드 키워드: {trends[n - 1].get('keyword', '')}",
        }
        for n in selected
    ]


def search_latest_info(title: str, max_results: int = 5) -> str:
    try:
        print(f"  검색 중: {title[:30]}...")
        results = []
        with DDGS() as ddgs:
            for item in ddgs.news(title, region="kr-kr", max_results=max_results):
                results.append(f"[출처: {item.get('url', '')}]\n제목: {item.get('title', '')}\n내용: {item.get('body', '')}")
            for item in ddgs.text(title, region="kr-kr", max_results=max_results):
                results.append(f"[출처: {item.get('href', '')}]\n제목: {item.get('title', '')}\n내용: {item.get('body', '')}")
        print(f"  검색 결과 {len(results)}개 수집")
        return "\n\n---\n\n".join(results)[:8000]
    except Exception as e:
        print(f"  검색 실패, 내부 데이터로 대체: {e}")
        return ""


def build_generation_prompt(topic: dict, web_context: str) -> str:
    web_section = f"\n=== 최신 검색 결과 ===\n{web_context}\n=====================\n" if web_context else ""
    categories = "|".join(ARTICLE_CATEGORIES)

    return f"""다음 주제로 한국어 테크/IT 블로그 글을 작성하세요. "Pickvolt"라는 한국 테크 뉴스 사이트에 실릴 글입니다.
{web_section}
주제: {topic['title']}
참고 카테고리: {topic.get('category', 'tech')}

작성 조건:
- 최신 검색 결과를 반영할 것 (사실 기반, 지어내지 말 것)
- 분량: 1,500~2,000자
- HTML 형식으로 작성할 것 (<h2>, <h3>, <p>, <ul>, <li>만 사용, 각 <h2>는 순수 텍스트만 포함)
- 자연스러운 블로그 기사형 문체로 작성할 것
- SEO를 고려한 제목과 소제목을 구성할 것
- 카테고리는 {categories} 중 가장 적합한 것 하나를 고를 것
- 마지막에 핵심 요약 1~2문장을 넣을 것

추가 규칙:
- 질문에 답변하는 Q&A 문체로 쓰지 말 것
- "현재 확인된 최신 정보", "제공된 검색 결과 기준", "먼저 말씀드리면" 같은 메타 표현 금지
- 같은 제목, 같은 소제목, 같은 문장을 반복하지 말 것
- 첫 문단에서 핵심 사실부터 바로 제시할 것

반드시 JSON만 반환:
{{
  "title": "SEO 최적화 블로그 제목",
  "content": "HTML 본문",
  "category": "{categories} 중 하나",
  "summary": "SEO용 요약 1~2문장",
  "labels": ["태그1", "태그2", "태그3"]
}}"""


def generate_article(topic: dict) -> dict | None:
    print("  🔍 최신 자료 검색 중...")
    web_context = search_latest_info(topic["title"])
    print("  📝 글쓰기 프롬프트 구성 중...")
    prompt = build_generation_prompt(topic, web_context)

    try:
        post_data = json.loads(call_chatgpt_cli(prompt, stage="초안 작성"))
    except Exception as e:
        print(f"[codex CLI 오류] {e}")
        return None

    if post_data.get("category") not in ARTICLE_CATEGORIES:
        post_data["category"] = topic.get("category", "tech")
    return post_data


def apply_korean_rules(html: str) -> tuple[str, int]:
    """HTML 텍스트 노드에 한국어 AI 패턴 규칙을 적용."""
    import re as _re
    from bs4 import NavigableString as _NS

    RULES = [
        ("되어진다", "된다"),
        ("되어집니다", "됩니다"),
        ("되어져", "돼"),
        ("결론적으로,\\s*", ""),
        ("결론적으로\\s+", ""),
        ("시사하는 바가 크다", "중요하다"),
        ("시사하는 바가 큽니다", "중요합니다"),
        ("주목할 만하다", "눈길을 끈다"),
        ("주목할 만합니다", "눈길을 끕니다"),
        ("할 필요가 있다", "해야 한다"),
        ("할 필요가 있습니다", "해야 합니다"),
        ("가능성이 있다고 평가됩니다", "것으로 보인다"),
        ("가능성이 있다고 평가된다", "것으로 보인다"),
        ("할 수 있을 것으로 보입니다", "할 것으로 보입니다"),
        ("할 수 있을 것으로 보인다", "할 것으로 보인다"),
        ("중요한 점은\\s+", ""),
        ("먼저 말씀드리면\\s+", ""),
        ("결과적으로,\\s*", ""),
        ("^또한,\\s+", ""),
        ("^또한\\s+", ""),
        ("^따라서,\\s+", ""),
        ("^따라서\\s+", ""),
        ("^나아가,\\s+", ""),
        ("^나아가\\s+", ""),
        ("매우 중요한", "중요한"),
        ("굉장히 중요한", "중요한"),
    ]
    MULTILINE_STARTS = ("^또한", "^따라서", "^나아가")

    soup = BeautifulSoup(html, "html.parser")
    count = 0
    for node in soup.find_all(string=True):
        if node.parent.name in {"script", "style", "code", "pre"}:
            continue
        original = str(node)
        text = original
        for pattern, replacement in RULES:
            flags = _re.MULTILINE if pattern.startswith(MULTILINE_STARTS) else 0
            text = _re.sub(pattern, replacement, text, flags=flags)
        if text != original:
            node.replace_with(_NS(text))
            count += 1
    return str(soup), count


def humanize_post(post_data: dict) -> dict:
    print("  ✍️ 문체 다듬기 준비 중...")
    prompt = f"""아래 HTML 블로그 글을 자연스러운 한국어 기사형 문체로 다듬어 주세요.

조건:
- 내용, 사실, 고유명사, 수치, 인용은 바꾸지 말 것
- HTML 구조는 유지할 것
- 같은 제목이나 같은 소제목 반복 금지
- 질문에 답변하는 문장처럼 보이는 표현 제거
- 메타 설명 문구 제거
- 너무 AI스럽거나 번역투인 표현만 정리할 것

제목: {post_data['title']}

본문:
{post_data['content']}

반드시 JSON만 반환:
{{"title": "다듬은 제목", "content": "다듬은 HTML 본문"}}"""
    try:
        result = json.loads(call_chatgpt_cli(prompt, stage="윤문"))
        result["category"] = post_data.get("category", "tech")
        result["labels"] = post_data.get("labels", [])
    except Exception as e:
        print(f"  ⚠️ AI 윤문 실패, 원본으로 규칙 적용: {e}")
        result = post_data.copy()

    cleaned_content, count = apply_korean_rules(result.get("content", ""))
    result["content"] = cleaned_content
    if count > 0:
        print(f"  🔧 규칙 기반 패턴 {count}곳 추가 수정")
    return result


def get_english_keyword(text: str) -> str:
    if not PEXELS_API_KEY:
        return ""
    prompt = f'다음 한국어 텍스트를 Pexels 이미지 검색용 짧은 영어 키워드 2~3단어로 바꿔 주세요. 다른 설명 없이 키워드만 반환하세요.\n\n텍스트: {text}'
    try:
        return call_chatgpt_cli(prompt, stage="이미지 키워드 생성").strip().replace('"', "")
    except Exception:
        return "technology"


def fetch_pexels_image(keyword: str) -> dict | None:
    if not PEXELS_API_KEY or not keyword:
        return None
    try:
        url = f"https://api.pexels.com/v1/search?query={keyword}&per_page=1&orientation=landscape"
        res = requests.get(url, headers={"Authorization": PEXELS_API_KEY}, timeout=10)
        data = res.json()
        if data.get("photos"):
            photo = data["photos"][0]
            return {
                "url": photo["src"]["large"],
                "photographer": photo["photographer"],
                "photographer_url": photo["photographer_url"],
            }
    except Exception as e:
        print(f"  ⚠️ Pexels 이미지 검색 실패: {e}")
    return None


def make_image_html(photo: dict, alt: str) -> str:
    return (
        f'<div style="text-align:center; margin:24px 0;">'
        f'<img src="{photo["url"]}" alt="{alt}" style="max-width:100%; border-radius:8px;">'
        f'<p><small>Photo by <a href="{photo["photographer_url"]}" target="_blank" rel="noopener noreferrer">'
        f'{photo["photographer"]}</a> on '
        f'<a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer">Pexels</a></small></p>'
        f"</div>"
    )


def add_image_to_post(post_data: dict) -> dict:
    if not PEXELS_API_KEY:
        return post_data

    print("  🖼️ 이미지 삽입 처리 중...")
    content = post_data.get("content", "")
    title = post_data["title"]
    inserted = 0
    thumbnail_url = None

    keyword = get_english_keyword(title)
    thumb_photo = fetch_pexels_image(keyword)
    if thumb_photo:
        thumbnail_url = thumb_photo["url"]

    soup = BeautifulSoup(content, "html.parser")
    for h2 in soup.find_all("h2"):
        h2_text = h2.get_text(strip=True)
        if not h2_text:
            continue
        h2_keyword = get_english_keyword(h2_text) or keyword
        photo = fetch_pexels_image(h2_keyword)
        if photo:
            h2.insert_after(BeautifulSoup(make_image_html(photo, h2_text), "html.parser"))
            inserted += 1
            print(f"  🖼️ 소제목 이미지 삽입 ({h2_keyword})")
        time.sleep(0.3)

    post_data["content"] = str(soup)
    post_data["thumbnail_url"] = thumbnail_url
    print(f"  ✅ 이미지 {inserted}개 삽입 완료")
    return post_data


def save_to_pickvolt(post_data: dict) -> tuple[str | None, str | None]:
    try:
        print("  💾 Pickvolt 초안 저장 준비 중...")
        payload = {
            "author_id": PICKVOLT_AUTHOR_ID,
            "author_name": PICKVOLT_AUTHOR_NAME,
            "title": post_data["title"],
            "content_html": post_data["content"],
            "category": post_data.get("category", "tech"),
            "summary": post_data.get("summary", ""),
            "tags": post_data.get("labels", []),
            "thumbnail_url": post_data.get("thumbnail_url"),
        }
        res = requests.post(
            f"{PICKVOLT_API_URL}/api/articles/auto-import",
            json=payload,
            headers={"Authorization": f"Bearer {ARTICLES_IMPORT_SECRET}"},
            timeout=20,
        )
        if not res.ok:
            print(f"  ⚠️ Pickvolt 저장 실패: {res.status_code} {res.text[:300]}")
            return None, None
        data = res.json()
        post_id = data.get("id")
        slug = data.get("slug")
        url = f"{PICKVOLT_API_URL}/articles/write?slug={slug}" if slug else None
        print(f"  ✅ [초안 저장] {post_data['title']}")
        if url:
            print(f"     검토/발행: {url}")
        return url, post_id
    except Exception as e:
        print(f"  ⚠️ Pickvolt 저장 실패: {e}")
        return None, None


def second_pass_humanize(post_ids: list[str], titles: dict[str, str], contents: dict[str, str]) -> None:
    if not post_ids:
        return
    print(f"\n[6/6] 저장 후 2차 윤문 중... ({len(post_ids)}개)")
    for post_id in post_ids:
        title = titles.get(post_id, "")
        content = contents.get(post_id, "")
        prompt = f"""아래 블로그 HTML을 자연스러운 기사형 한국어로 한 번 더 다듬어 주세요.

조건:
- 사실, 수치, 고유명사 변경 금지
- 제목/소제목 반복 금지
- 질문 답변체 금지
- HTML 유지

제목: {title}
본문:
{content[:6000]}

반드시 JSON만 반환:
{{"title":"다듬은 제목","content":"다듬은 HTML"}}"""
        try:
            result = json.loads(call_chatgpt_cli(prompt, stage="저장 후 2차 윤문"))
            res = requests.patch(
                f"{PICKVOLT_API_URL}/api/articles/auto-import",
                json={"id": post_id, "title": result.get("title", title), "content_html": result.get("content", content)},
                headers={"Authorization": f"Bearer {ARTICLES_IMPORT_SECRET}"},
                timeout=20,
            )
            if res.ok:
                print(f"  ✅ 2차 윤문 완료: {title[:40]}")
            else:
                print(f"  ⚠️ 2차 윤문 저장 실패: {res.status_code}")
        except Exception as e:
            print(f"  ⚠️ 2차 윤문 실패, 원본 유지: {e}")
        time.sleep(1)


def send_telegram_notification(posts_info: list[dict]) -> None:
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        return
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    msg_lines = [f"📝 Pickvolt 초안 저장 완료 ({today})\n"]
    for i, post in enumerate(posts_info, 1):
        msg_lines.append(f"{i}. {post['title']}")
        if post.get("url"):
            msg_lines.append(f"   링크: {post['url']}")
    msg_lines.append("\n/articles/write 에서 확인 후 발행하세요.")
    try:
        url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        requests.post(url, data={"chat_id": TELEGRAM_CHAT_ID, "text": "\n".join(msg_lines)}, timeout=10)
        print("  ✅ 텔레그램 알림 전송 완료")
    except Exception as e:
        print(f"  ⚠️ 텔레그램 알림 실패: {e}")


def main() -> None:
    require_config()

    print("=" * 60)
    print("  Pickvolt 자동 글 생성기")
    print(f"  실행 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    print("\n[1/5] 주제 수집 중...")
    topics = select_topics()
    for i, topic in enumerate(topics, 1):
        print(f"  {i}. [{topic['category']}] {topic['title']}")

    print("\n[2/5] 글 생성 중...")
    generated_posts = []
    for i, topic in enumerate(topics, 1):
        print(f"\n  ({i}/{len(topics)}) 주제 처리 시작: {topic['title'][:40]}")
        post_data = generate_article(topic)
        if post_data:
            generated_posts.append(post_data)
            print(f"  ✅ 생성 완료: {post_data['title']}")
        else:
            print("  ⚠️ 생성 실패")
        if i < len(topics):
            time.sleep(1)

    print("\n[3/5] 윤문 중...")
    humanized_posts = []
    for i, post_data in enumerate(generated_posts, 1):
        print(f"  ({i}/{len(generated_posts)}) 윤문 진행 중: {post_data['title'][:40]}")
        humanized_posts.append(humanize_post(post_data))
        time.sleep(1)

    print("\n[4/5] 이미지 삽입 중...")
    final_posts = [add_image_to_post(p) for p in humanized_posts]

    print("\n[5/5] Pickvolt 초안 저장 중...")
    saved_posts = []
    new_post_ids = []
    titles_by_id: dict[str, str] = {}
    contents_by_id: dict[str, str] = {}
    for post_data in final_posts:
        url, post_id = save_to_pickvolt(post_data)
        if url:
            saved_posts.append({"title": post_data["title"], "url": url})
        if post_id:
            new_post_ids.append(post_id)
            titles_by_id[post_id] = post_data["title"]
            contents_by_id[post_id] = post_data["content"]
        time.sleep(0.5)

    if saved_posts:
        send_telegram_notification(saved_posts)

    second_pass_humanize(new_post_ids, titles_by_id, contents_by_id)

    print("\n" + "=" * 60)
    print(f"  완료: {len(saved_posts)}개 글 초안 저장")
    print("  /articles/write 에서 확인 후 발행하세요.")
    print("=" * 60)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n[중단] 입력 또는 작업이 사용자에 의해 취소되었습니다.")
