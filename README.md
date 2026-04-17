# Wallpaper Metadata Service

촬영한 사진의 EXIF 메타데이터(날짜, GPS)를 읽어 월페이퍼에 날짜/장소 텍스트를 자동 삽입하는 서비스입니다.

## 구성

- `web`: Next.js 기반 웹 앱 (업로드, 메타 추출, 렌더, 다운로드)
- `api`: Express 기반 경량 API (GPS 역지오코딩 프록시)

## 실행 방법

### 1) API 서버

```bash
cd api
npm install
npm run dev
```

기본 포트: `8787`

### 2) 웹 앱

```bash
cd web
npm install
NEXT_PUBLIC_API_BASE_URL=http://localhost:8787 npm run dev
```

기본 포트: `3000`

## 현재 MVP 기능

- JPEG/PNG/HEIC 업로드(브라우저 지원 범위)
- EXIF 촬영 날짜 추출 (`DateTimeOriginal`, `CreateDate` fallback)
- GPS가 있으면 API로 시/국가 텍스트 생성
- GPS가 없으면 수동 위치 입력
- Desktop/Mobile 프리셋 렌더링
- JPG 다운로드

## 개인정보 처리 메모

- 사진 메타 파싱과 렌더링은 브라우저에서 수행됩니다.
- GPS가 포함된 경우에만 좌표(`lat/lon`)가 역지오코딩 API로 전송됩니다.
- 원본 이미지는 서버로 업로드하지 않습니다.
