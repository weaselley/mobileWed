# index.html 구조 분리 전략

## 문서 목적
- 현재 단일 파일인 `index.html`을 `reference/`와 비슷한 책임 분리 구조로 옮기기 위한 구현 전략을 정리한다.
- 목표는 "한 번에 대수술"이 아니라, 동작을 최대한 유지하면서 점진적으로 분리하는 것이다.

## reference 구조 요약

### reference의 분리 방식
- `reference/index.html`
  - 시맨틱한 섹션 마크업만 담당
  - 텍스트와 이미지 바인딩 포인트를 `data-*` 속성으로 노출
  - 외부 CSS/JS 파일만 로드
- `reference/styles.css`
  - 모든 스타일 담당
  - 색상, 간격, 컴포넌트 클래스가 분리되어 있음
- `reference/app.js`
  - 화면 데이터 객체
  - 렌더링 함수
  - 갤러리, 모달, 카피, 애니메이션 같은 동작 로직
- `reference/photos.js`
  - 사진 경로만 별도 관리

### reference의 핵심 특징
- HTML은 "구조"
- CSS는 "표현"
- JS는 "데이터 + 동작"
- 사진 목록은 별도 파일

## 현재 index.html 상태 요약

### 현재 한 파일 안에 섞여 있는 것
- 메타 정보
- 전체 CSS
- 전체 HTML
- 갤러리 이미지 데이터
- 다국어 문구
- UI 상태 전환 로직
- 라이트박스 로직
- 꽃잎 애니메이션 로직
- 방명록 로직
- 복사 버튼 로직

### 현재 구조의 문제점
- 수정 지점 찾기가 어렵다.
- 텍스트, 이미지, 동작이 서로 강하게 결합되어 있다.
- 비슷한 성격의 값이 여기저기 흩어져 있다.
- 일부 이벤트가 inline handler (`onclick`) 기반이라 테스트와 재사용성이 낮다.
- 이미지가 base64로 직접 박혀 있어 유지보수가 어렵다.

## 목표 구조

`reference`와 동일한 철학을 따르되, 현재 페이지 특성에 맞춰 아래처럼 분리하는 것이 적절하다.

```text
/
  index.html
  styles.css
  app.js
  content.js
  photos.js
  assets/
    photos/
    icons/
```

## 파일별 책임 제안

### 1. `index.html`
- 담당
  - 문서 메타
  - 시맨틱 마크업
  - 섹션 컨테이너
  - JS가 바인딩할 `id`, `data-*` 포인트
- 넣지 말 것
  - 긴 CSS
  - 긴 JS
  - 큰 base64 이미지 데이터
  - 복잡한 텍스트 상수

### 2. `styles.css`
- 담당
  - 전체 레이아웃
  - 타이포그래피
  - 섹션별 스타일
  - 컴포넌트 스타일
  - 애니메이션 키프레임
- 권장 분류
  - reset/base
  - shell/layout
  - section
  - component
  - utility/state

### 3. `content.js`
- 담당
  - 한국어/영어 텍스트
  - 이름, 날짜, 계좌, 문구
  - 섹션별 콘텐츠 데이터
- 의도
  - "디자인 수정"과 "문구 수정"을 분리

예시 구조:

```js
window.cardContent = {
  defaultLang: "ko",
  profile: {
    brideKo: "현지",
    groomKo: "병헌",
    brideEn: "Hannah",
    groomEn: "Ben",
  },
  dates: {
    shortKo: "2026. 05. 30",
    shortEn: "May 30, 2026",
  },
  messages: {
    heroTitleKo: "저희 결혼합니다",
    heroTitleEn: "We Are Getting Married",
  }
};
```

### 4. `photos.js`
- 담당
  - 히어로 이미지
  - 소개 섹션 이미지
  - 갤러리 리스트
  - 푸터/날짜/인트로용 이미지 경로
- 현재 `GAL` 배열과 base64 이미지들을 이 파일로 이동하는 것이 핵심

예시 구조:

```js
window.cardPhotos = {
  hero: "assets/photos/hero.jpg",
  introBackground: "assets/photos/intro.jpg",
  about: [
    "assets/photos/about-1.jpg",
    "assets/photos/about-2.jpg",
  ],
  gallery: [
    "assets/photos/gallery-01.jpg",
    "assets/photos/gallery-02.jpg",
  ]
};
```

### 5. `app.js`
- 담당
  - 초기화
  - 언어 전환
  - 라이트박스
  - 갤러리 더보기
  - 음악 재생
  - 꽃잎 애니메이션
  - 복사 버튼
  - 방명록 렌더링/제출
- 지향점
  - inline handler 제거
  - `addEventListener` 기반 바인딩
  - 섹션별 함수 분리

## 권장 분리 단위

현재 페이지 기준으로는 "파일 분리"와 "기능 분리"를 동시에 진행해야 한다.

### 1. 콘텐츠 계층
- 이름
- 날짜
- 문구
- 계좌 정보
- 방명록 기본 문구
- 언어별 placeholder

### 2. 이미지 계층
- 히어로 이미지
- 소개용 사진
- 갤러리
- 오픈그래프 이미지

### 3. UI 동작 계층
- 언어 전환
- 음악 버튼
- 라이트박스
- 갤러리 토글
- 토스트
- 방명록
- 인트로 닫기

### 4. 시각 효과 계층
- reveal 애니메이션
- 꽃잎 애니메이션
- 버튼 상태 변화
- 아코디언 열기/닫기

## 현재 index.html를 reference 스타일로 옮기는 실제 전략

### 단계 1. CSS 먼저 분리
- 가장 먼저 `<style>` 전체를 `styles.css`로 이동
- HTML에서 `<link rel="stylesheet" href="styles.css">`로 교체
- 이 단계는 비교적 리스크가 낮다.

### 단계 2. JS를 통째로 파일 밖으로 이동
- `<script>` 내용을 `app.js`로 이동
- 아직 데이터와 로직은 섞여 있어도 괜찮다.
- 우선 "HTML에서 스크립트가 빠진 상태"를 만든다.

### 단계 3. 이미지 데이터 분리
- `GAL` 배열 분리
- hero/about/gallery의 base64 이미지를 외부 파일로 바꾸고 `photos.js`에 매핑
- 용량과 가독성 개선 효과가 가장 크다.

### 단계 4. 문구/계좌/이름/날짜 분리
- 한글/영문 문구를 `content.js`로 이동
- 하드코딩된 placeholder, 버튼 문구, 날짜 텍스트도 함께 이동

### 단계 5. inline handler 제거
- 현재 예시
  - `onclick="toggleMusic()"`
  - `onclick="setLang('ko')"`
  - `onclick="copyText(...)"`
- 이를 `app.js`의 이벤트 바인딩으로 교체

예시:

```js
document.getElementById("musicBtn").addEventListener("click", toggleMusic);
document.getElementById("bKo").addEventListener("click", () => setLang("ko"));
```

### 단계 6. 섹션 단위 초기화 함수 도입
- `initLang()`
- `initMusic()`
- `initLightbox()`
- `initGallery()`
- `initGuestbook()`
- `initIntro()`
- `initReveal()`
- `initBlossom()`

이렇게 나누면 reference의 `app.js`처럼 읽기 쉬워진다.

### 단계 7. DOM 의존을 명시적으로 정리
- 반복 사용되는 셀렉터를 상수화
- 데이터와 DOM 조작을 분리

예시:

```js
const els = {
  body: document.body,
  musicBtn: document.getElementById("musicBtn"),
  galleryContainer: document.getElementById("gal-container"),
  toast: document.getElementById("toast"),
};
```

## 추천 최종 구조 예시

### `index.html`
- 마크업만 유지
- 인라인 이벤트 제거
- 외부 `styles.css`, `photos.js`, `content.js`, `app.js` 로드

### `content.js`
- `window.cardContent`
- 언어 문구와 정적 텍스트 담당

### `photos.js`
- `window.cardPhotos`
- 이미지 경로와 갤러리 목록 담당

### `app.js`
- `initApp()`
- 렌더링 함수
- 이벤트 바인딩
- 상태 관리

### `styles.css`
- 현재 `<style>` 전량 이관

## 섹션별 분리 매핑

### 인트로/히어로
- HTML
  - 레이아웃 껍데기
- photos.js
  - 히어로 이미지
- content.js
  - 타이틀, 이름, 날짜
- app.js
  - 인트로 닫기, 배경 동기화, 꽃잎

### 메시지/날짜/부모 소개
- HTML
  - 컨테이너
- content.js
  - 문구, 부모 이름, 날짜
- app.js
  - 언어 전환 시 텍스트 반영

### 소개/갤러리
- photos.js
  - 이미지 목록
- content.js
  - 카드 제목/설명
- app.js
  - 렌더링, 더보기, 라이트박스

### 마음 전하실 곳
- content.js
  - 계좌/베네모 정보
- app.js
  - 아코디언, 복사 버튼

### 방명록
- content.js
  - 기본 문구, placeholder
- app.js
  - 입력 검증, 카드 렌더링, 상태 변경

## 최소 침습 리팩터링 순서

가장 안전한 순서는 아래다.

1. `styles.css` 분리
2. `app.js` 분리
3. `photos.js` 분리
4. `content.js` 분리
5. inline handler 제거
6. `init*` 함수로 재정리
7. 필요하면 렌더링 함수로 추가 정리

이 순서를 추천하는 이유:
- 화면이 깨지는 원인을 한 단계씩 좁혀볼 수 있다.
- 한 번에 구조를 바꾸지 않아도 된다.
- reference처럼 가되, 현재 페이지의 동작을 잃을 가능성이 낮다.

## 구현 시 주의사항

### 1. 언어 전환은 텍스트만 바꾸도록 유지
- 지금은 `.ko`, `.en` 토글 방식이 섞여 있다.
- 이를 유지해도 되지만, `content.js`로 일부 문구를 빼면 중복 관리가 생길 수 있다.
- 한 가지 방식으로 통일해야 한다.

권장:
- 짧은 문구는 `.ko`, `.en` 마크업 유지
- 입력 placeholder, 버튼 상태 문구, 토스트 문구는 JS 콘텐츠 객체에서 관리

### 2. 방명록은 즉시 렌더링 구조로 두기
- 기능이 단순하므로 별도 프레임워크는 필요 없다.
- 단, 데이터와 DOM 생성 문자열을 분리하는 편이 좋다.

### 3. base64 이미지는 빨리 제거하는 편이 좋다
- 가독성을 심하게 해친다.
- diff 관리가 어렵다.
- `assets/photos/*.jpg`로 빼는 것이 좋다.

### 4. 아코디언과 라이트박스는 컴포넌트처럼 생각
- 지금은 전역 함수 기반이라 파일이 커질수록 얽힌다.
- `bindAccordion()`, `bindLightbox()`처럼 묶어두면 이후 유지보수가 쉬워진다.

## 최종 권장안

가장 현실적인 목표는 reference를 완전히 복제하는 것이 아니라, 아래 4파일 구조를 먼저 만드는 것이다.

```text
index.html
styles.css
content.js
photos.js
app.js
```

이 정도만 되어도 현재의 가장 큰 문제인
- 한 파일 과밀
- 이미지/문구/동작 혼합
- 수정 난이도 증가

를 상당 부분 해결할 수 있다.

## 결론
- 현재 `index.html`은 reference와 달리 모든 책임이 한 파일에 모여 있다.
- reference의 핵심은 "구조, 표현, 데이터, 사진"의 분리다.
- 따라서 현재 페이지도 먼저 `styles.css`, `app.js`, `photos.js`, `content.js`로 나누는 것이 가장 적절하다.
- 구현은 CSS 분리부터 시작해 점진적으로 JS, 이미지, 콘텐츠를 떼어내는 순서가 가장 안전하다.
- 특히 이미지 base64 제거와 inline handler 제거가 구조 개선의 핵심 전환점이다.
