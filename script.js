const app = {
  currentView: 'view-dashboard',
  currentCategory: null, // 선택된 대분류 (주중 수업, 주말 수업 등)

  // 학급 분류 데이터 정의
  classStructure: {
    '수학': ['기하', '조합', '대수', '정수', '중등 교과수학', '고등 교과수학', '사고력 수학', '수학경시 및 대회', '기타(수학)'],
    '과학': ['물리학', '화학', '생명과학', '지구과학', '중등 교과과학', '고등 교과과학', '사고력 과학', '과학경시 및 대회', '기타(과학)']
  },

  init: function() {
    this.bindEvents();
    this.bindModalEvents();
  },

  bindEvents: function() {
    // 사이드바 아코디언 메뉴 트위스트
    const groupHeaders = document.querySelectorAll('.nav-group-header');
    groupHeaders.forEach(header => {
      header.addEventListener('click', (e) => {
        const group = e.currentTarget.parentElement;
        group.classList.toggle('open');
      });
    });

    // 사이드바 하위 메뉴(대분류) 클릭 로직
    const subItems = document.querySelectorAll('.sub-item');
    subItems.forEach(item => {
      item.addEventListener('click', (e) => {
        document.querySelectorAll('.sub-item, .single-item').forEach(el => el.classList.remove('active'));
        e.currentTarget.classList.add('active');

        const targetViewId = e.currentTarget.getAttribute('data-target');
        const category = e.currentTarget.getAttribute('data-category');
        
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

    // 단일 메뉴 (기초설정 등)
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

  // ------------------------------------
  // 모달 제어 및 캐스케이딩(연동) 이벤트
  // ------------------------------------
  bindModalEvents: function() {
    const midSelect = document.getElementById('class-mid-cat');
    const subWrapSelect = document.getElementById('wrap-sub-select');
    const subWrapInput = document.getElementById('wrap-sub-input');
    const subSelectEl = document.getElementById('class-sub-cat-select');

    if (midSelect) {
      midSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        if (val === '수학' || val === '과학') {
          // 셀렉트 박스 활성화, 인풋 비활성화
          subWrapSelect.classList.remove('hidden');
          subWrapInput.classList.add('hidden');
          
          // 옵션 동적 렌더링
          const options = this.classStructure[val];
          subSelectEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        } else if (val === '기타') {
          // 인풋 활성화, 셀렉트 박스 비활성화 (수기 입력 모드)
          subWrapSelect.classList.add('hidden');
          subWrapInput.classList.remove('hidden');
        } else {
          subWrapSelect.classList.remove('hidden');
          subWrapInput.classList.add('hidden');
          subSelectEl.innerHTML = '<option value="">-- 중분류를 먼저 선택하세요 --</option>';
        }
      });
    }
  },

  openModal: function(modalId) {
    document.getElementById('modal-container').classList.remove('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
  },

  closeModal: function() {
    document.getElementById('modal-container').classList.add('hidden');
    document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
  },

  // ------------------------------------
  // 저장 로직 (더미 연동)
  // ------------------------------------
  saveClass: function() {
    const mainCat = document.getElementById('class-main-cat').value;
    const midCat = document.getElementById('class-mid-cat').value;
    
    if(!midCat) {
      alert("중분류를 선택하세요.");
      return;
    }

    let subCat = "";
    if (midCat === '기타') {
      subCat = document.getElementById('class-sub-cat-input').value.trim();
    } else {
      subCat = document.getElementById('class-sub-cat-select').value;
    }

    const className = document.getElementById('class-name-input').value.trim();

    if(!subCat || !className) {
      alert("소분류와 학급분류(반 이름)를 모두 입력하세요.");
      return;
    }
    
    console.log(`[학급저장] ${mainCat} > ${midCat} > ${subCat} > ${className}`);
    alert(`[${mainCat}] ${midCat} > ${subCat} > ${className} 추가 완료! (GAS 배포 시 연동됨)`);
    this.closeModal();
  },

  saveInstructor: function() {
    const name = document.getElementById('inst-name').value;
    const email = document.getElementById('inst-email').value;

    if(!name || !email) { alert("이름과 지메일을 입력하세요."); return; }

    console.log(`강사 저장: ${name} (${email})`);
    this.closeModal();

    // 챗방 초대 우회(수동) 안내 팝업
    const inviteLink = "https://chat.google.com/room/XXXXX";
    alert(`강사 등록 완료!\n아래 구글 챗방 초대 링크를 복사하여 전달해주세요:\n${inviteLink}`);
  },

  savePreSchedule: function() {
    if(!this.currentCategory) { alert("좌측 메뉴에서 대분류(주중/주말 등)를 선택해 주세요."); return; }
    alert(`[${this.currentCategory}] 사전 준비일정 등록!`);
    this.closeModal();
  },

  saveCurriculum: function() {
    if(!this.currentCategory) { alert("좌측 메뉴에서 대분류를 선택해 주세요."); return; }
    alert(`[${this.currentCategory}] 수업 진도계획 등록!`);
    this.closeModal();
  },

  saveTimetable: function() {
    if(!this.currentCategory) { alert("좌측 메뉴에서 대분류를 선택해 주세요."); return; }
    const start = document.getElementById('time-start').value;
    const end = document.getElementById('time-end').value;
    if(!start || !end) {
      alert("시작 시간과 종료 시간을 입력해 주세요.");
      return;
    }
    alert(`[${this.currentCategory}] 시간표 등록! (${start} ~ ${end})`);
    this.closeModal();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
