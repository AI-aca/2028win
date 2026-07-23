# Phase 2 기획서: 학급 계층화 및 UI 구조 개편 계획 (implementation_plan.md)

## 1. 개요
사용자의 추가 요구사항인 학급 계층화(대/중/소분류), 사이드바의 아코디언 메뉴 구조 변경, 기존 `alert()`를 대체하는 실제 글래스모피즘 모달 폼 UI 기획을 반영하기 위한 상세 구현 계획서입니다.

## 2. 학급 계층화 및 DB 스키마 재설계
### 2.1. 요구사항
- 기존 1차원적인 학급 구조를 3단계(대분류, 중분류, 소분류)로 세분화.
- 예: [대분류: 주중반, 주말반, 특강반] / [중분류: 수학, 과학] / [소분류: 기하, 대수, 물리]

### 2.2. 변경 대상: `Code.gs` 및 백엔드 로직
- **`설정_학급명` 시트 스키마 변경**
  - 기존: `ID`, `학급명`, `정렬순서`, `사용여부`
  - 변경: `ID`, `대분류`, `중분류`, `소분류`, `학급명`(조합명칭), `정렬순서`, `사용여부`
- **`getClasses()` API 변경**
  - 반환되는 데이터 객체에 `majorCategory`, `middleCategory`, `subCategory` 속성 추가 반영.

## 3. 사이드바 내비게이션 아코디언 트리 구조 기획
### 3.1. 요구사항
- 상위 메인 메뉴(사전 준비일정, 수업 진도계획, 시간표 등)를 클릭하면 뷰 전환 대신 아코디언 드롭다운으로 '대분류' 메뉴 노출.
- 드롭다운된 하위 메뉴('대분류')를 클릭했을 때 메인 뷰가 열리고 해당 분류에 맞는 데이터만 표시하도록 라우팅 변경.

### 3.2. 변경 대상: `index.html`
- **DOM 구조 변경**: `<li class="nav-item">`를 아코디언 상위 컨테이너로 활용.
- 내부에 `<ul class="sub-menu" style="display:none;">` 리스트를 생성하여 하위 대분류 메뉴(주중반, 주말반 등) 배치.
- 뷰 이동 속성인 `data-target`을 하위 메뉴로 이동하고, 어떤 대분류가 클릭되었는지 식별할 속성(예: `data-category`) 부여.

### 3.3. 변경 대상: `script.js`
- **`bindEvents()` 로직 수정**:
  - 상위 메뉴 클릭 시 하위 `sub-menu` 리스트 영역 슬라이드 토글(열기/닫기) 효과 적용.
  - 하위 메뉴 클릭 시 상위 메뉴 토글 방지(이벤트 버블링 차단) 및 `switchView()` 라우팅 연동.
- **`switchView(viewId, title, category)`**:
  - 뷰 이동과 함께 `category` 정보를 받아 해당 뷰 영역 내 데이터를 필터링하거나 제목(`pageTitle`)을 '사전 준비일정 - 주중반'과 같이 동적으로 변경하는 로직 추가.

## 4. 글래스모피즘 모달(Modal) 팝업 UI 전체 기획
### 4.1. 개요
- **디자인 컨셉**: 글래스모피즘(반투명 블러 배경, 은은한 테두리, 부드러운 그림자).
- **기존 상태**: `app.openModal()` 호출 시 `alert()`가 뜨는 임시 구현.
- **변경 사항**: `#modal-container` 영역 내에 동적으로 HTML을 주입하여 렌더링.

### 4.2. 모달 뼈대 구조 (`index.html` 추가분)
```html
<div class="modal-backdrop">
  <div class="glass-modal">
    <div class="modal-header">
      <h3 class="modal-title">모달 제목</h3>
      <button class="btn-close">×</button>
    </div>
    <div class="modal-body">
      <!-- 동적 폼 콘텐츠 -->
    </div>
    <div class="modal-footer">
      <button class="btn btn-secondary" onclick="app.closeModal()">취소</button>
      <button class="btn btn-primary" onclick="app.submitModal()">저장</button>
    </div>
  </div>
</div>
```

### 4.3. 상세 입력 폼(Form) 기획
1. **학급 추가 (`class-modal`)**
   - 대분류: Select 또는 텍스트 입력 (주중반/주말반/특강반)
   - 중분류: Select 또는 텍스트 입력 (수학/과학 등)
   - 소분류: Select 또는 텍스트 입력 (기하/대수/물리 등)
   - 자동 생성된 '학급명' 확인란 및 사용여부 토글 버튼.
2. **강사 추가 (`instructor-modal`)**
   - 강사명, 연락처, 이메일.
   - 담당 가능한 과목 및 비고란.
3. **사전준비일정 추가 (`preschedule-modal`)**
   - 일정명 (텍스트).
   - 적용 대상 학급 분류 (대/중/소 선택).
   - 시작일시 / 종료일시 (Date Input).
   - 담당자 (강사 선택) 및 세부 내용.
4. **수업진도계획 추가 (`curriculum-modal`)**
   - 대상 분류 및 학급 선택.
   - 주차/회차 입력 (Number).
   - 단원(주제) 및 진도(학습내용) 설명.
5. **시간표 관리 추가 (`timetable-modal`)**
   - 대상 학급 및 강사 할당.
   - 요일 선택(월~일) 및 교시(시작~종료시간).
   - 배정 강의실 명칭.

---
위 구조를 바탕으로 향후 코드 구현 단계(Coder Agent)에서 실제 파일을 편집하여 기능과 레이아웃을 반영할 예정입니다.
