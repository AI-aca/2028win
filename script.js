// 프론트엔드 상태 및 유틸리티 객체
const app = {
  // 현재 활성화된 뷰
  currentView: 'view-preschedule',

  // 초기화 함수
  init: function() {
    this.bindEvents();
    // TODO: 초기 데이터 로드 호출 추가
  },

  // 이벤트 바인딩
  bindEvents: function() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const targetViewId = e.currentTarget.getAttribute('data-target');
        const titleText = e.currentTarget.querySelector('.text').innerText;
        this.switchView(targetViewId, titleText);
        
        // 메뉴 활성화 UI 변경
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        e.currentTarget.classList.add('active');
      });
    });
  },

  // 뷰 전환 로직
  switchView: function(viewId, title) {
    if (this.currentView === viewId) return;

    // 기존 뷰 숨기기
    const oldView = document.getElementById(this.currentView);
    if (oldView) {
      oldView.classList.remove('active');
      setTimeout(() => oldView.classList.add('hidden'), 300); // 애니메이션 대기
    }

    // 새 뷰 보이기
    const newView = document.getElementById(viewId);
    if (newView) {
      newView.classList.remove('hidden');
      // 레이아웃 스레드 갱신을 위한 지연
      setTimeout(() => newView.classList.add('active'), 10);
    }

    // 타이틀 변경
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      pageTitle.innerText = title;
    }

    this.currentView = viewId;
  },

  // 모달 열기 (더미 구현)
  openModal: function(modalType) {
    console.log('Open modal: ' + modalType);
    // TODO: 실제 모달 UI 구현 및 렌더링 로직 추가
    alert('모달 오픈: ' + modalType);
  },

  // 로딩 스피너 제어
  showLoading: function() {
    document.getElementById('loadingSpinner').classList.remove('hidden');
  },
  hideLoading: function() {
    document.getElementById('loadingSpinner').classList.add('hidden');
  },

  // 알림(Toast) 메시지
  showToast: function(message, type = 'info') {
    // TODO: 토스트 UI 로직 구현
    console.log(`[Toast] ${type}: ${message}`);
  }
};

// DOM 로드 시 앱 초기화
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
