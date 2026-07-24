# 연락처 자동 포맷팅 기능 선행 코드 팩트 분석 보고서 (0단계) - [보완 반영본]

## 1. 개요
사용자 요구사항: 학생관리 테이블의 "학부모 연락처", "학생 연락처" 및 강사관리 테이블의 "연락처" 열에 대해 **화면 표시(초기 렌더링 및 입력 후)는 항상 3자리-4자리-4자리(예: `010-1234-5678`) 형태**로 보이게 하고, **구글 시트 저장 시 맨 앞 `0`이 날아가는 현상을 완벽히 방지**하는 안전한 처리 방식 검증.

---

## 2. 세부 파악 사항 및 물리적 팩트 검증

### (1) 학생관리 탭 (`type === 'student'`) 연락처 열 인덱스
- **코드 위치**: `script.js` 208번 라인 (`renderView('student')`)
  ```javascript
  this.renderFlatTable('student', this.data.students, [
    {label:'학생명', idx:1, fixed:true, width:'10%'},
    {label:'센터', idx:2},
    {label:'학교', idx:3},
    {label:'학년', idx:4},
    {label:'학부모 연락처', idx:5},
    {label:'학생 연락처', idx:6},
    {label:'비고', idx:7}
  ]);
  ```
- **인덱스 파악 결과**:
  - **학부모 연락처**: `colIdx = 5` (`row[5]`, payload 키: `parentPhone`)
  - **학생 연락처**: `colIdx = 6` (`row[6]`, payload 키: `studentPhone`)

### (2) 강사관리 탭 (`type === 'instructor'`) 연락처 열 존재 여부 및 인덱스
- **코드 위치**: `script.js` 209번 라인 (`renderView('instructor')`)
  ```javascript
  this.renderFlatTable('instructor', this.data.instructors, [
    {label:'강사명', idx:1, fixed:true, width:'10%'},
    {label:'영역', idx:2},
    {label:'과목', idx:3},
    {label:'연락처', idx:4},
    {label:'지메일', idx:5},
    {label:'비고', idx:6}
  ]);
  ```
- **인덱스 파악 결과**:
  - **연락처**: `colIdx = 4` (`row[4]`, payload 키: `phone`)

### (3) 화면 렌더링 및 데이터 치환 지점 분석
- **A. 초기 화면 렌더링 시 (새로고침 / 데이터 수신 시)**:
  - `script.js` line 457~468 (`renderFlatTable` 내부 셀 생성 로직)
  - `let val = row[colIdx] || '';`
  - 연락처 열인 경우 `val = app.formatPhoneNumber(val);` 을 거쳐 `<td>`에 표시하면 시트에 기존에 `01012345678`로 저장되어 있던 `010-1234-5678`로 저장되어 있던 화면에는 100% 항상 하이픈 포함 예쁜 형태로 렌더링됨.

- **B. 셀 수정 후 blur 시 (`onFlatCellBlur`)**:
  - `script.js` line 512~ (`onFlatCellBlur`)
  - `newValue` 추출 직후 및 `rowObj[colIdx] = newValue;` 할당 전 `colIdx`가 연락처 열이면 `newValue = this.formatPhoneNumber(newValue);` 적용.
  - `cell.textContent = newValue;`로 DOM 업데이트.

### (4) 구글 시트 맨 앞 `0` 유실 방지 (010 -> 10 절삭 방지) 팩트 기반 안전 방안
- **문제 원인**: 구글 시트(GAS)에 순수 숫자 형태(`01012345678`)로 저장 요청을 보낼 때 구글 시트 내부 엔진이 이를 '숫자(Number)' 유형으로 자동 추론하여 맨 앞 `0`을 잘라내고 `1012345678`로 저장하는 현상이 일어납니다.
- **최고의 해결책 (하이픈 포함 문자열 저장)**:
  - 프론트엔드에서 하이픈이 포함된 문자열 포맷(`010-1234-5678`)으로 서버에 보냅니다.
  - 하이픈(`-`)이 포함되면 구글 시트가 100% **문자열(Text)**로 인식하여 맨 앞의 `0`이 절대 절삭되지 않습니다.
  - 화면에서도 항상 하이픈 형태로 보이고, 시트 저장 시에도 앞 `0` 손실 없이 가장 안전하게 텍스트로 보존됩니다.

---

## 3. 구현 로직 제안 (참고용)

### (1) 전화번호 포맷팅 유틸리티 함수 (`script.js` 내 추가)
```javascript
formatPhoneNumber: function(str) {
  if (!str) return '';
  const cleaned = ('' + str).replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 10) {
    if (cleaned.startsWith('02')) {
      return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  } else if (cleaned.length === 9 && cleaned.startsWith('02')) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{4})/, '$1-$2-$3');
  }
  return str; // 숫자가 아닌 일반 문자열인 경우 그대로 유지
}
```

### (2) `renderFlatTable` 렌더링 시 포맷팅 적용
```javascript
// script.js line 457 부근
let val = row[colIdx] || '';
if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
  val = this.formatPhoneNumber(val);
}
```

### (3) `onFlatCellBlur` 내 포맷팅 적용 및 시트 전달
```javascript
// script.js line 528 부근
const colIdx = parseInt(cell.getAttribute('data-col-idx'));

if ((type === 'student' && (colIdx === 5 || colIdx === 6)) || (type === 'instructor' && colIdx === 4)) {
  newValue = this.formatPhoneNumber(newValue);
  cell.textContent = newValue;
}
```

---
본 보완 분석 보고서는 사용자의 부연 설명 및 구글 시트 데이터 타입 특성까지 반영하여 작성되었습니다.
