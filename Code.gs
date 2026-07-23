// 2028 영재학교반 관리 시스템 백엔드 (GAS)
// 사용자 지정 데이터 저장 전용 구글 드라이브 폴더 ID
const ROOT_FOLDER_ID = '1w8Wyg4Yuurltlwnc8VNKdbz0DcvtxZvp';
const DB_FILE_NAME = '[2028 영재학교반 통합 DB]';

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('2028 영재학교반 관리')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ==========================================
// DB 스프레드시트 확보 및 초기화 로직
// ==========================================
function getDbSpreadsheet() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const files = folder.getFilesByName(DB_FILE_NAME);
  
  if (files.hasNext()) {
    // 파일이 이미 존재하면 해당 파일 열기
    return SpreadsheetApp.openById(files.next().getId());
  } else {
    // 파일이 없으면 새로 생성하고 폴더로 이동
    const newSs = SpreadsheetApp.create(DB_FILE_NAME);
    const file = DriveApp.getFileById(newSs.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // 루트에서 제거
    
    // 시트(탭) 생성 및 헤더 설정
    const sheets = [
      { name: '설정_학급명', headers: ['ID', '대분류', '중분류', '소분류', '학급분류(반이름)', '등록일시'] },
      { name: '설정_강사정보', headers: ['ID', '강사명', '연락처', '지메일', '등록일시'] },
      { name: '사전준비일정', headers: ['ID', '대분류', '중분류', '소분류', '학급분류', '일자', '내용', '비고', '등록일시'] },
      { name: '수업진도계획', headers: ['ID', '대분류', '중분류', '소분류', '학급분류', '주차', '내용', '등록일시'] },
      { name: '시간표', headers: ['ID', '대분류', '중분류', '소분류', '학급분류', '요일', '시작시간', '종료시간', '강사', '등록일시'] }
    ];
    
    sheets.forEach((sData, idx) => {
      let sheet = newSs.getSheetByName(sData.name);
      if (!sheet) {
        if (idx === 0) {
          // 첫 번째 시트는 Sheet1을 이름변경
          sheet = newSs.getSheets()[0];
          sheet.setName(sData.name);
        } else {
          sheet = newSs.insertSheet(sData.name);
        }
      }
      // 헤더 추가
      sheet.appendRow(sData.headers);
      sheet.getRange(1, 1, 1, sData.headers.length).setFontWeight("bold").setBackground("#f3f3f3");
    });
    
    return newSs;
  }
}

// ==========================================
// 0. 초기 데이터 로드
// ==========================================
function getInitialData() {
  try {
    const ss = getDbSpreadsheet();
    const result = {};
    
    const sheetNames = ['설정_학급명', '설정_강사정보', '사전준비일정', '수업진도계획', '시간표'];
    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          result[name] = data.slice(1); // 헤더 제외
        } else {
          result[name] = [];
        }
      } else {
        result[name] = [];
      }
    });
    return result;
  } catch (error) {
    return { error: error.message };
  }
}

// 유틸리티: 고유 ID 생성
function generateId() {
  return Utilities.getUuid();
}

function getCurrentTime() {
  return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
}

// ==========================================
// 1. 학급 트리 관리 (4단계 계층화)
// ==========================================
function saveClassData(mainCat, midCat, subCat, className) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('설정_학급명');
      const id = generateId();
      sheet.appendRow([id, mainCat, midCat, subCat, className, getCurrentTime()]);
      return { success: true, message: '학급 저장 완료' };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: '동시 접속 지연. 다시 시도해 주세요.' };
  }
}

// ==========================================
// 2. 강사 정보 관리
// ==========================================
function saveInstructorData(name, phone, email) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('설정_강사정보');
      const id = generateId();
      sheet.appendRow([id, name, phone, email, getCurrentTime()]);
      return { success: true, message: '강사 정보 등록 완료' };
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
// 3. 사전 준비일정 관리
// ==========================================
function savePreSchedule(mainCat, midCat, subCat, className, date, content, note) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('사전준비일정');
      sheet.appendRow([generateId(), mainCat, midCat, subCat, className, date, content, note, getCurrentTime()]);
      return { success: true };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}

// ==========================================
// 4. 수업 진도계획
// ==========================================
function saveCurriculum(mainCat, midCat, subCat, className, week, content) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('수업진도계획');
      sheet.appendRow([generateId(), mainCat, midCat, subCat, className, week, content, getCurrentTime()]);
      return { success: true };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}

// ==========================================
// 5. 시간표 관리
// ==========================================
function saveTimetable(mainCat, midCat, subCat, className, day, startTime, endTime, instructor) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('시간표');
      sheet.appendRow([generateId(), mainCat, midCat, subCat, className, day, startTime, endTime, instructor, getCurrentTime()]);
      return { success: true };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}
