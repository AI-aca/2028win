// 2028 영재학교반 관리 시스템 백엔드 (GAS)
// 사용자 지정 데이터 저장 전용 구글 드라이브 폴더 ID
const ROOT_FOLDER_ID = '1w8Wyg4Yuurltlwnc8VNKdbz0DcvtxZvp';
const DB_FILE_NAME = '[2028 영재학교반 통합 DB]';

// ==========================================
// 통신 규격 (CORS 완벽 대응을 위한 doPost/doGet)
// ==========================================
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;
    let result = { success: false, message: '알 수 없는 액션' };
    
    if (action === 'saveClassData') result = saveClassData(payload.mainCat, payload.midCat, payload.subCat, payload.className);
    else if (action === 'saveInstructorData') result = saveInstructorData(payload.name, payload.phone, payload.email);
    else if (action === 'savePreSchedule') result = savePreSchedule(payload.mainCat, payload.midCat, payload.subCat, payload.className, payload.date, payload.content, payload.note);
    else if (action === 'saveCurriculum') result = saveCurriculum(payload.mainCat, payload.midCat, payload.subCat, payload.className, payload.week, payload.content);
    else if (action === 'saveTimetable') result = saveTimetable(payload.mainCat, payload.midCat, payload.subCat, payload.className, payload.day, payload.start, payload.end, payload.instructor);
    else if (action === 'deleteData') result = deleteData(payload.sheetName, payload.id);
    
    return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({success: false, message: error.message})).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  if (e.parameter.action === 'getInitialData') {
    return ContentService.createTextOutput(JSON.stringify(getInitialData())).setMimeType(ContentService.MimeType.JSON);
  }
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
    return SpreadsheetApp.openById(files.next().getId());
  } else {
    const newSs = SpreadsheetApp.create(DB_FILE_NAME);
    const file = DriveApp.getFileById(newSs.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file); // 루트에서 제거
    
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
          sheet = newSs.getSheets()[0];
          sheet.setName(sData.name);
        } else {
          sheet = newSs.insertSheet(sData.name);
        }
      }
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
    const result = { success: true };
    
    const sheetNames = ['설정_학급명', '설정_강사정보', '사전준비일정', '수업진도계획', '시간표'];
    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const data = sheet.getDataRange().getValues();
        if (data.length > 1) {
          result[name] = data.slice(1);
        } else {
          result[name] = [];
        }
      } else {
        result[name] = [];
      }
    });
    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateId() { return Utilities.getUuid(); }
function getCurrentTime() { return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }

// ==========================================
// 저장 로직 모음
// ==========================================
function saveClassData(mainCat, midCat, subCat, className) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('설정_학급명');
      sheet.appendRow([generateId(), mainCat, midCat, subCat, className, getCurrentTime()]);
      return { success: true, message: '학급 저장 완료' };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}

function saveInstructorData(name, phone, email) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName('설정_강사정보');
      sheet.appendRow([generateId(), name, phone, email, getCurrentTime()]);
      return { success: true };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}

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

// ==========================================
// 삭제 로직
// ==========================================
function deleteData(sheetName, id) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return { success: false, message: '시트를 찾을 수 없습니다.' };
      
      const data = sheet.getDataRange().getValues();
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
          sheet.deleteRow(i + 1); // sheet 1-indexed (data[0] is header)
          return { success: true };
        }
      }
      return { success: false, message: '해당 ID를 찾을 수 없습니다.' };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}
