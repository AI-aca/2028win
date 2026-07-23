// 2028 영재학교반 관리 시스템 백엔드 (GAS)
// 사용자 지정 데이터 저장 전용 구글 드라이브 폴더 ID
const ROOT_FOLDER_ID = '1w8Wyg4Yuurltlwnc8VNKdbz0DcvtxZvp';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('2028 영재학교반 관리')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// 1. 학급 트리 관리 (4단계 계층화)
// ==========================================
// 시트 구조: ID | 대분류 | 중분류 | 소분류 | 학급분류(반이름) | 사용여부
function saveClassData(mainCat, midCat, subCat, className) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      // TODO: 지정된 ROOT_FOLDER_ID 내의 시트에 4단계 계층 학급 데이터 저장
      return { success: true, message: '저장 완료' };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: '동시 접속 지연' };
  }
}

// ==========================================
// 2. 강사 정보 관리
// ==========================================
// 시트 구조: ID | 강사명 | 연락처 | 지메일 | 사용여부
function saveInstructorData(name, phone, email) {
  // TODO: LockService 적용 및 DB 저장 로직
}

// ==========================================
// 3. 사전 준비일정 관리
// ==========================================
// 시트 구조: ID | 대분류 | 중분류 | 소분류 | 학급분류 | 일자 | 내용 | 비고 | 작성자
function savePreSchedule(mainCat, classId, date, content, note) {
  // TODO: LockService 적용 및 DB 저장 로직
}

// ==========================================
// 4. 수업 진도계획
// ==========================================
// 시트 구조: ID | 대분류 | 중분류 | 소분류 | 학급분류 | 주차 | 내용 | 작성자
function saveCurriculum(mainCat, classId, week, content) {
  // TODO: LockService 적용 및 DB 저장 로직
}

// ==========================================
// 5. 시간표 관리 (시작/종료 시간 분리 반영)
// ==========================================
// 시트 구조: ID | 대분류 | 중분류 | 소분류 | 학급분류 | 요일 | 시작시간 | 종료시간 | 강사 | 작성자
function saveTimetable(mainCat, classId, day, startTime, endTime, instructor) {
  // TODO: LockService 적용 및 DB 저장 로직
}
