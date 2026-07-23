// 2028 영재학교반 관리 시스템 백엔드 (GAS)
const ROOT_FOLDER_ID = '1w8Wyg4Yuurltlwnc8VNKdbz0DcvtxZvp';
const DB_FILE_NAME = '[2028 영재학교반 통합 DB]';

function getAuthPassword() {
  const ss = getDbSpreadsheet();
  let sheet = ss.getSheetByName('설정');
  if (!sheet) {
    sheet = ss.insertSheet('설정');
    sheet.getRange('A1:B1').setValues([['비밀번호', '2028w!']]);
    return '2028w!';
  }
  const pwd = sheet.getRange('B1').getValue();
  return pwd ? pwd.toString() : '';
}

function doPost(e) {
  try {
    const payloadStr = e.parameter.payload || (e.postData ? e.postData.contents : '{}');
    const payload = JSON.parse(payloadStr);
    const action = e.parameter.action || payload.action;
    
    // Check password for ALL POST actions
    const authPass = payload.authPass || '';
    if (authPass !== getAuthPassword()) {
      return ContentService.createTextOutput(JSON.stringify({success: false, message: '비밀번호 인증 실패'})).setMimeType(ContentService.MimeType.JSON);
    }
    
    let result = { success: false, message: '알 수 없는 액션' };
    
    if (action === 'getInitialData') result = getInitialData();
    else if (action === 'upsertPreSchedule') result = upsertPreSchedule(payload);
    else if (action === 'upsertCurriculum') result = upsertCurriculum(payload);
    else if (action === 'upsertTimetable') result = upsertTimetable(payload);
    else if (action === 'upsertStudent') result = upsertStudent(payload);
    else if (action === 'upsertInstructor') result = upsertInstructor(payload);
    else if (action === 'deleteData') result = deleteData(payload.sheetName, payload.id);
    else if (action === 'reorderRows') result = reorderRows(payload);
    else if (action === 'saveUISettings') result = saveUISettings(payload);
    
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

function getDbSpreadsheet() {
  const folder = DriveApp.getFolderById(ROOT_FOLDER_ID);
  const files = folder.getFilesByName(DB_FILE_NAME);
  
  if (files.hasNext()) {
    return SpreadsheetApp.openById(files.next().getId());
  } else {
    const newSs = SpreadsheetApp.create(DB_FILE_NAME);
    const file = DriveApp.getFileById(newSs.getId());
    folder.addFile(file);
    DriveApp.getRootFolder().removeFile(file);
    
    const sheets = [
      { name: '사전준비일정', headers: ['ID', '일자', '내용', '상태', '비고', '등록일시'] },
      { name: '수업진도계획', headers: ['ID', '주차', '과목', '진도내용', '등록일시'] },
      { name: '시간표', headers: ['ID', '일자', '구분', '시작시간', '종료시간', '반이름', '과목', '담당자', '비고', '등록일시'] },
      { name: '학생관리', headers: ['ID', '이름', '센터', '학교', '학년', '학부모연락처', '학생연락처', '비고', '등록일시'] },
      { name: '강사관리', headers: ['ID', '강사명', '영역', '과목', '연락처', '지메일', '비고', '등록일시'] }
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

function getInitialData() {
  try {
    const ss = getDbSpreadsheet();
    const result = { success: true };
    const sheetNames = ['사전준비일정', '수업진도계획', '시간표', '학생관리', '강사관리'];
    
    sheetNames.forEach(name => {
      const sheet = ss.getSheetByName(name);
      if (sheet) {
        const data = sheet.getDataRange().getDisplayValues();
        result[name] = data.length > 1 ? data.slice(1) : [];
      } else {
        result[name] = [];
      }
    });
    
    try {
      result.uiSettings = PropertiesService.getScriptProperties().getProperties() || {};
    } catch(e) {
      result.uiSettings = {};
    }

    return result;
  } catch (error) {
    return { success: false, error: error.message };
  }
}

function generateId() { return Utilities.getUuid(); }
function getCurrentTime() { return new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }); }

function upsertRow(sheetName, id, rowDataArray) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) return { success: false, message: '시트를 찾을 수 없습니다.' };

      if (id) {
        const data = sheet.getDataRange().getValues();
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === id) {
            sheet.getRange(i + 1, 1, 1, rowDataArray.length).setValues([rowDataArray]);
            return { success: true, message: '업데이트 완료', id: id };
          }
        }
      }
      
      const newId = id || generateId();
      rowDataArray[0] = newId;
      rowDataArray[rowDataArray.length - 1] = getCurrentTime();
      sheet.appendRow(rowDataArray);
      return { success: true, message: '생성 완료', id: newId };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: '동시 접속 지연' };
  }
}

function upsertPreSchedule(p) { return upsertRow('사전준비일정', p.id, [p.id, p.date, p.content, p.status, p.note, '']); }
function upsertCurriculum(p) { return upsertRow('수업진도계획', p.id, [p.id, p.week, p.subject, p.content, '']); }
function upsertTimetable(p) { return upsertRow('시간표', p.id, [p.id, p.date, p.type, p.start, p.end, p.className, p.subject, p.instructor, p.note, '']); }
function upsertStudent(p) { return upsertRow('학생관리', p.id, [p.id, p.name, p.center, p.school, p.grade, p.parentPhone, p.studentPhone, p.note, '']); }
function upsertInstructor(p) { return upsertRow('강사관리', p.id, [p.id, p.instructorName, p.subject, p.subSubject, p.phone, p.email, p.note, '']); }

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
          sheet.deleteRow(i + 1);
          return { success: true };
        }
      }
      return { success: false, message: '해당 ID를 찾을 수 없습니다.' };
    } catch (error) { return { success: false, message: error.message }; } finally { lock.releaseLock(); }
  } else { return { success: false, message: '동시 접속 지연' }; }
}

function reorderRows(payload) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(10000)) {
    try {
      const ss = getDbSpreadsheet();
      const sheet = ss.getSheetByName(payload.sheetName);
      if (!sheet) return { success: false, message: '시트를 찾을 수 없습니다.' };
      
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) return { success: true }; // No data to reorder
      
      const headers = data[0];
      const rows = data.slice(1);
      const orderedIds = payload.orderedIds;
      
      const rowMap = {};
      rows.forEach(r => { rowMap[r[0]] = r; });
      
      const newRows = [];
      // Push ordered rows first
      orderedIds.forEach(id => {
        if (rowMap[id]) {
          newRows.push(rowMap[id]);
          delete rowMap[id];
        }
      });
      // Push remaining rows if any
      for (const id in rowMap) {
        newRows.push(rowMap[id]);
      }
      
      sheet.getRange(2, 1, newRows.length, headers.length).setValues(newRows);
      
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: '동시 접속 지연' };
  }
}

function saveUISettings(payload) {
  const lock = LockService.getScriptLock();
  if (lock.tryLock(5000)) {
    try {
      PropertiesService.getScriptProperties().setProperty(payload.key, payload.value);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      lock.releaseLock();
    }
  } else {
    return { success: false, message: '동시 접속 지연' };
  }
}
