/**
 * 2028 영재학교반 관리 시스템 백엔드 (Google Apps Script)
 * 
 * 주요 기능:
 * 1. doGet(e)를 통한 웹앱 제공
 * 2. 다중 사용자 동시 접속 처리를 위한 LockService 구현
 */

// 웹앱 진입점
function doGet(e) {
  // index.html 파일을 HTML 출력으로 변환하여 반환
  // X-Frame-Options 설정을 해제하여 다른 사이트에 임베드 가능하도록 할 수 있으나 기본 설정 유지
  const htmlOutput = HtmlService.createHtmlOutputFromFile('index');
  htmlOutput.setTitle('2028 영재학교반 관리');
  htmlOutput.addMetaTag('viewport', 'width=device-width, initial-scale=1');
  return htmlOutput;
}

/**
 * 다른 html 파일을 include 하기 위한 유틸리티 함수 (필요시 사용)
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 데이터 생성/수정/삭제 시 동시성 제어를 위한 래퍼 함수 예시
 * 실제 데이터 처리 함수들은 이 패턴을 따라 작성해야 함
 */
function executeWithLock(callback) {
  // 스크립트 잠금 획득 (동시 수정 방지)
  const lock = LockService.getScriptLock();
  try {
    // 최대 30초 대기
    lock.waitLock(30000);
    
    // 실제 콜백 로직 실행
    return callback();
    
  } catch (e) {
    Logger.log('Lock timeout or error: ' + e.message);
    throw new Error('시스템이 바쁩니다. 잠시 후 다시 시도해주세요.');
  } finally {
    // 잠금 해제
    lock.releaseLock();
  }
}

/**
 * [API] 예시: 학급명 데이터 가져오기
 * DB 스키마 (Sheet: 설정_학급명): ID, 학급명, 정렬순서, 사용여부
 */
function getClasses() {
  // TODO: 실제 스프레드시트 접근 로직 구현
  return [
    { id: '1', name: '퀀텀', order: 1, active: true },
    { id: '2', name: '노바', order: 2, active: true }
  ];
}

/**
 * [API] 예시: 강사 정보 데이터 가져오기
 * DB 스키마 (Sheet: 설정_강사정보): ID, 강사명, 연락처, 지메일
 */
function getInstructors() {
  // TODO: 실제 스프레드시트 접근 로직 구현
  return [
    { id: '1', name: '홍길동', phone: '010-1234-5678', email: 'hong@gmail.com' },
    { id: '2', name: '김철수', phone: '010-9876-5432', email: 'kim@gmail.com' }
  ];
}
