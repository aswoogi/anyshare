# Implementation History

- **Version**: v1.1
- **Date**: 2026-10-21
- **Changes**: 드래그 앤 드롭 및 파일 선택 시 다중 파일 동시 첨부 지원 기능 구현

---

## 1. 개요 및 변경 배경
- 기존 AnyShare 입력창(`QuickInputBar`)에서는 드래그 앤 드롭 또는 파일 첨부 시 `dataTransfer.files[0]` 단일 파일만 처리되어 사용자가 여러 개의 파일을 한 번에 업로드할 수 없는 제약이 있었습니다.
- 이를 개선하여 사용자가 탐색기 등에서 여러 파일을 한 번에 드래그 앤 드롭하거나 파일 첨부 대화상자에서 여러 파일을 선택하여 등록할 수 있도록 확장하였습니다.

## 2. 세부 구현 사항
1. **`components/QuickInputBar.tsx`**:
   - 다중 파일 관리 상태(`attachedFiles: File[]`) 도입
   - 중복 파일 추가 방지 로직 적용 (`name-size-lastModified` 키 기반)
   - 드래그 앤 드롭 이벤트(`onDrop`)에서 전달된 전체 파일 목록(`Array.from(e.dataTransfer.files)`) 처리
   - 숨김 `<input type="file" multiple ... />`을 통해 파일 선택 다이얼로그에서도 여러 파일 동시 선택 지원
   - 첨부된 파일 목록 시각화 UI:
     - 총 첨부 파일 개수 및 총 파일 용량 요약 표시
     - 각 파일별 파일명, 크기(KB/MB 단위 포맷팅), 개별 제거(`X`) 버튼 제공
     - 전체 첨부 파일 일괄 삭제 버튼 제공
     - 첨부 파일이 많아도 UI가 깨지지 않도록 유연한 반응형 칩 목록 및 스크롤 영역 제공
   - 제출(`handleSubmit`) 시:
     - 첨부된 모든 파일을 Supabase Storage에 순차 업로드 및 개별 아이템(`type: 'file'`)으로 등록
     - 파일 업로드 진행률(`uploadProgress`) 표시 (예: "업로드 중 (1/3)...")
     - 파일과 함께 추가 메모(텍스트/링크/할일)가 입력된 경우 해당 메모도 유실 없이 함께 생성

2. **`hooks/useGlobalPaste.ts` & `app/page.tsx`**:
   - 전역 붙여넣기(Ctrl+V) 시 여러 개의 파일이 클립보드에 있을 경우를 대비해 `onPasteFiles` 콜백 및 `files?: File[]` 지원 추가.

## 3. Maintenance & Fixes
- 초기 구현 완료 및 타입/빌드 검증 완료.
