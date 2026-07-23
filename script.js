const app = {
  currentView: 'view-dashboard',
  currentCategory: null,

  init: function() {
    this.bindEvents();
  },

  bindEvents: function() {
    // 사이드바 아코디언 토글
    const groupHeaders = document.querySelectorAll('.nav-group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const group = e.currentTarget.parentElement;
        group.classList.toggle('open');
      });
    });

    // 서브 아이템(대분류) 클릭 -> 라우팅
    const subItems = document.querySelectorAll('.sub-item');
    subItems.forEach(item => {
      item.addEventListener('click', (e) => {
        // 활성화 표시 초기화
        document.querySelectorAll('.sub-item, .single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetViewId = e.currentTarget.getAttribute('data-target');
        const category = e.currentTarget.getAttribute('data-category');
        
        // 뷰의 공통 타이틀 업데이트 (예: 주말반 사전 준비일정)
        this.currentCategory = category;
        const viewEl = document.getElementById(targetViewId);
        if (viewEl) {
          const label = viewEl.querySelector('.current-category-label');
          if (label) label.innerText = `[${category}]`;
        }

        const titleText = e.currentTarget.parentElement.previousElementSibling.querySelector('.text').innerText;
        document.getElementById('pageTitle').innerText = `${category} - ${titleText}`;

        this.switchView(targetViewId);
      });
    });

    // 단일 메뉴 (설정) 클릭
    const singleItems = document.querySelectorAll('.single-item');
    singleItems.forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.sub-item, .single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetViewId = e.currentTarget.getAttribute('data-target');
        document.getElementById('pageTitle').innerText = e.currentTarget.querySelector('.text').innerText;
        this.currentCategory = null;
        this.switchView(targetViewId);
      });
    });
  },

  switchView: function(viewId) {
    if (this.currentView === viewId && viewId !== 'view-settings') {
      // 뷰가 같아도 카테고리가 다르면 다시 렌더링하도록 놔둠
    }

    const oldView = document.getElementById(this.currentView);
    if (oldView) {
      oldView.classList.remove('active');
      oldView.classList.add('hidden');
    }

    const newView = document.getElementById(viewId);
    if (newView) {
      newView.classList.remove('hidden');
      newView.classList.add('active');
    }

    this.currentView = viewId;
  },

  // 모달 제어
  openModal: function(modalId) {
    document.getElementById('modal-container').classList.remove('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
  },

  closeModal: function() {
    document.getElementById('modal-container').classList.add('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
  },

  // 1. 학급 저장 로직 (대/중/소분류)
  saveClass: function() {
    const mainCat = document.getElementById('class-main-cat').value;
    const midCat = document.getElementById('class-mid-cat').value;
    const subCat = document.getElementById('class-sub-cat').value;

    if(!midCat || !subCat) {
      alert("중분류와 소분류를 모두 입력하세요.");
      return;
    }
    
    // TODO: google.script.run 연동하여 시트에 대/중/소 저장
    console.log(`저장됨: [${mainCat}] ${midCat} - ${subCat}`);
    this.closeModal();
    alert(`학급 [${mainCat} > ${midCat} > ${subCat}] 추가 완료!`);
  },

  // 2. 강사 저장 및 초대 링크 안내
  saveInstructor: function() {
    const name = document.getElementById('inst-name').value;
    const email = document.getElementById('inst-email').value;

    if(!name || !email) {
      alert("이름과 지메일을 입력하세요.");
      return;
    }

    // TODO: DB 저장 후 초대 링크 복사 알림창
    console.log(`강사 저장: ${name} (${email})`);
    this.closeModal();

    // 챗방 초대 우회(수동) 안내 팝업
    const inviteLink = "https://chat.google.com/room/AAAAxxx"; // 예시 링크
    alert(`강사 등록 완료!\n\n아래 구글 챗방 초대 링크를 강사님께 전달해주세요:\n${inviteLink}`);
  },

  savePreSchedule: function() {
    if(!this.currentCategory) { alert("좌측에서 학급 대분류를 먼저 선택하세요."); return; }
    alert(`${this.currentCategory} 사전 준비일정 저장 로직 실행`);
    this.closeModal();
  },

  saveCurriculum: function() {
    if(!this.currentCategory) { alert("좌측에서 학급 대분류를 먼저 선택하세요."); return; }
    alert(`${this.currentCategory} 수업 진도계획 저장 로직 실행`);
    this.closeModal();
  },

  saveTimetable: function() {
    if(!this.currentCategory) { alert("좌측에서 학급 대분류를 먼저 선택하세요."); return; }
    alert(`${this.currentCategory} 시간표 저장 로직 실행`);
    this.closeModal();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
