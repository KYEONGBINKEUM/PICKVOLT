# Pickvolt – Claude Code Instructions

## 절대 규칙 (반드시 지킬 것)

### 1. 한국어 하드코딩 금지
- UI에 표시되는 **모든 문자열**은 `lib/i18n.tsx`의 `t()` 함수를 통해 처리해야 한다.
- 새 문자열이 필요하면 반드시 `lib/i18n.tsx`에 **7개 로케일 모두** (en, es, pt, fr, de, ja, ko) 키를 추가한다.
- 컴포넌트에서 `useI18n()` 훅을 사용하지 않는 경우, `t` 함수를 props로 전달하거나 훅을 추가한다.
- 예외: `console.log`, 코드 주석, 에러 로그는 영어로 작성 가능.

**잘못된 예:**
```tsx
<p>방금 전</p>
<button>더보기</button>
<h2>관련 커뮤니티 글</h2>
```

**올바른 예:**
```tsx
<p>{t('time.just')}</p>
<button>{t('community.more')}</button>
<h2>{t('community.related_posts')}</h2>
```

### 2. i18n 키 추가 방법
`lib/i18n.tsx`의 `translations` 객체에 7개 로케일 순서대로 동일 키를 추가:
```
en → es → pt → fr → de → ja → ko
```
기존 키 근처에 의미적으로 관련된 곳에 삽입한다.

### 3. 타입 뱃지/라벨 색상
커뮤니티 타입 라벨(forum, review, compare, free, qa)은 타입별 다른 색상을 쓰지 않는다.
모두 `text-accent/70` 으로 통일한다.

### 4. 커뮤니티 피드
- `components/PostFeed.tsx`의 `CardPost`, `CompactPost`, `Pagination`, `PostSkeleton`을 재사용한다.
- 새 커뮤니티 페이지를 만들 때 직접 카드/리스트 UI를 구현하지 말고 반드시 이 공유 컴포넌트를 사용한다.

---

## 프로젝트 개요

- **프레임워크**: Next.js 14 App Router (`app/` 디렉토리)
- **스타일**: Tailwind CSS, 다크 테마
- **인증**: Supabase Auth (Google OAuth)
- **DB**: Supabase (PostgreSQL)
- **다국어**: `lib/i18n.tsx` — 7개 로케일 (en, es, pt, fr, de, ja, ko)

## 주요 파일 구조
```
app/
  community/          # 커뮤니티 (피드, forum, reviews, free, qa, compare)
  product/[id]/       # 제품 상세 페이지
  api/                # API Routes
components/
  PostFeed.tsx        # 공유 피드 컴포넌트 (CardPost, CompactPost, Pagination)
  CommunityRelated.tsx
  ReviewSection.tsx
lib/
  i18n.tsx            # 다국어 번역 (모든 UI 문자열)
  supabase.ts
```
