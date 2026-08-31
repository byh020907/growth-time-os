import { getBoardCapacity, getNextCards } from '../domain.js'
import {
  dispatchAction,
  emptyDraft,
  escapeHtml,
  formatDate,
  projectName,
} from '../ui.js'
import './guided-entry-form.js'

const styles = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button, input, select { font: inherit; }
  .page-shell { width: min(1120px, calc(100% - 32px)); margin: 50px auto 0; }
  .page-heading, .section-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
  .page-heading { margin-bottom: 28px; }
  .page-heading h1 { margin: 7px 0 8px; font: 600 clamp(34px, 5vw, 54px)/1.1 var(--font-serif); letter-spacing: -.035em; }
  .page-heading p:last-child { margin: 0; color: var(--muted); }
  .eyebrow { margin: 0 0 7px; color: var(--green); font: 700 11px/1.3 var(--font-mono); letter-spacing: .13em; }
  .panel { margin-bottom: 18px; padding: 26px; background: rgb(255 253 248 / 82%); border: 1px solid var(--line); border-radius: 18px; }
  .section-heading { margin-bottom: 20px; }
  .section-heading h2 { margin: 0; font-size: 20px; }
  .section-heading > span { color: var(--muted); font: 700 12px/1.3 var(--font-mono); }
  .project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 12px; }
  .project-card { padding: 18px; background: var(--paper); border: 1px solid var(--line); border-radius: 13px; }
  .project-card > div { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
  .project-card h3 { margin: 0 0 15px; }
  .project-card p { margin: 10px 0 0; line-height: 1.55; }
  .label { display: block; margin-bottom: 6px; color: var(--muted); font: 700 10px/1.2 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
  .date-chip { padding: 4px 7px; color: var(--muted); background: var(--white); border: 1px solid var(--line); border-radius: 7px; font-size: 11px; white-space: nowrap; }
  .button, .text-button, .icon-button { border: 0; cursor: pointer; }
  .button { padding: 11px 16px; border-radius: 11px; font-weight: 700; }
  .button-primary { color: var(--white); background: var(--ink); }
  .button-secondary { color: var(--ink); background: var(--paper-deep); border: 1px solid var(--line); }
  .button-small { padding: 7px 9px; font-size: 12px; }
  .text-button { padding: 7px; color: var(--muted); background: transparent; }
  .danger-text { color: var(--red); }
  button:disabled { opacity: .35; cursor: not-allowed; }
  .quick-add { margin-bottom: 18px; padding: 16px; display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 9px; background: var(--white); border: 2px solid var(--ink); border-radius: 16px; box-shadow: var(--shadow); }
  .quick-add input, .quick-add select { min-width: 0; padding: 13px 14px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 10px; }
  .quick-add input { font-size: 17px; }
  .quick-add input:focus, .quick-add select:focus { outline: 3px solid color-mix(in srgb, var(--green) 34%, transparent); border-color: var(--green); }
  .quick-meta { grid-column: 1 / -1; display: flex; justify-content: space-between; gap: 12px; color: var(--muted); font-size: 11px; }
  .advanced-settings { margin-bottom: 18px; padding: 0; overflow: hidden; background: rgb(255 253 248 / 72%); border: 1px solid var(--line); border-radius: 14px; }
  .advanced-settings > summary { padding: 14px 17px; color: var(--muted); cursor: pointer; font-size: 13px; font-weight: 700; }
  .advanced-content { padding: 4px 18px 18px; }
  .advanced-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 14px; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .guided-wrap { margin-bottom: 18px; }
  .guided-heading { margin: 0 0 12px; display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .guided-heading h2 { margin: 4px 0 0; font-size: 19px; }
  .guided-heading span { color: var(--muted); font: 700 11px/1.3 var(--font-mono); }
  .chain-review { padding: clamp(24px, 5vw, 42px); background: var(--white); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow); }
  .chain-review h2 { margin: 5px 0 8px; font: 600 clamp(24px, 3vw, 34px)/1.2 var(--font-serif); }
  .chain-review > p { margin: 0; color: var(--muted); }
  .draft-list { margin: 24px 0; display: grid; gap: 9px; }
  .draft-card { padding: 13px 15px; display: flex; align-items: center; gap: 12px; background: var(--paper); border: 1px solid var(--line); border-radius: 11px; }
  .draft-card span { width: 26px; height: 26px; display: grid; place-items: center; color: var(--paper); background: var(--green); border-radius: 8px; font: 700 11px/1 var(--font-mono); }
  .draft-card strong { font-size: 14px; }
  .review-actions { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; }
  .review-actions > div { display: flex; gap: 9px; }
  .capacity-note { margin: 18px 0; padding: 14px 17px; color: #775b1d; background: var(--amber-soft); border: 1px solid #e4d29a; border-radius: 12px; font-size: 13px; }
  .board-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
  .board-column { margin: 0; }
  .card-list { display: grid; gap: 10px; }
  .queue-card { padding: 15px; display: grid; grid-template-columns: auto 1fr auto; gap: 13px; align-items: start; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; }
  .queue-number { width: 28px; height: 28px; display: grid; place-items: center; color: var(--paper); background: var(--ink); border-radius: 8px; font: 700 11px/1 var(--font-mono); }
  .queue-content h3 { margin: 0 0 7px; font-size: 15px; }
  .queue-content p { margin: 0; color: var(--muted); font-size: 12px; line-height: 1.5; }
  .queue-content small { display: block; margin-top: 8px; color: var(--green-dark); }
  .queue-actions { display: flex; align-items: center; flex-wrap: wrap; justify-content: flex-end; gap: 3px; }
  .icon-button { width: 27px; height: 27px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 7px; }
  .waiting-card { grid-template-columns: 1fr auto; border-left: 4px solid #c4983f; }
  .empty-copy { margin: 0; padding: 16px 0; color: var(--muted); }
  .edit-panel { margin-top: 18px; box-shadow: var(--shadow); scroll-margin-top: 110px; }
  @media (max-width: 760px) { .page-shell { margin-top: 34px; } .page-heading { flex-direction: column; } .quick-add { grid-template-columns: 1fr auto; } .quick-add select { grid-column: 1 / -1; grid-row: 2; } .quick-add:has(select) .quick-meta { grid-row: 3; } .board-grid { grid-template-columns: 1fr; } .panel { padding: 19px; } .queue-card { grid-template-columns: auto 1fr; } .queue-actions { grid-column: 2; justify-content: flex-start; } .waiting-card { grid-template-columns: 1fr; } .waiting-card .queue-actions { grid-column: 1; } }
`

class PlanningView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.chainDrafts = []
    this.chainStage = 'entry'
  }

  set state(value) {
    this._state = value
    if (this.showProjectForm === undefined) this.showProjectForm = false
    if (this.showDetailedForm === undefined) this.showDetailedForm = false
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const state = this._state
    if (!state) return
    const queue = getNextCards(state)
    const waiting = state.cards.filter((card) => card.status === 'WAITING')
    const capacity = getBoardCapacity(state)
    const selectedProject =
      state.projects.find((project) => project.id === this.selectedProjectId) ?? state.projects[0]
    this.selectedProjectId = selectedProject?.id

    this.shadowRoot.innerHTML = `<style>${styles}</style>
      <main class="page-shell">
        <div class="page-heading">
          <div><p class="eyebrow">TODO LIST</p><h1>할 일</h1><p>한 줄로 추가하면 지금과 다음 순서가 자동으로 정해집니다.</p></div>
        </div>
        <form class="quick-add" id="quick-add-form">
          <label class="visually-hidden" for="quick-title">할 일</label>
          <input id="quick-title" name="title" required autocomplete="off" placeholder="할 일 한 줄" />
          ${
            state.projects.length > 1
              ? `<label class="visually-hidden" for="quick-project">프로젝트</label><select id="quick-project" name="projectId">${state.projects
                  .map(
                    (project) =>
                      `<option value="${project.id}" ${project.id === this.selectedProjectId ? 'selected' : ''}>${escapeHtml(project.name)}</option>`,
                  )
                  .join('')}</select>`
              : ''
          }
          <button class="button button-primary" type="submit" ${capacity === 0 ? 'disabled' : ''}>추가</button>
          <div class="quick-meta"><span>Enter로 추가</span><span>추가 가능 ${capacity}개</span></div>
        </form>

        <details class="advanced-settings" ${this.showProjectForm || this.showDetailedForm ? 'open' : ''}>
          <summary>자세히 작성 · 프로젝트 설정</summary>
          <div class="advanced-content">
            <div class="advanced-actions">
              <button class="button button-secondary button-small" data-toggle-detailed ${!state.projects.length || capacity === 0 ? 'disabled' : ''}>자세히 작성</button>
              <button class="button button-secondary button-small" data-toggle-project>프로젝트 설정</button>
            </div>
            <div id="project-form-slot">${this.showProjectForm ? this.projectFormHtml() : ''}</div>
            ${
              state.projects.length
                ? `<section class="panel project-summary">
                    <div class="section-heading"><div><p class="eyebrow">PROJECTS</p><h2>프로젝트 기준</h2></div><span>${state.projects.length}개</span></div>
                    <div class="project-grid">${state.projects
                      .map(
                        (project) => `
                          <article class="project-card">
                            <div><h3>${escapeHtml(project.name)}</h3>${project.deadline ? `<span class="date-chip">${escapeHtml(project.deadline)}</span>` : ''}</div>
                            <p><span class="label">완료 상태</span>${escapeHtml(project.completionDefinition)}</p>
                            <p><span class="label">기본 실행</span>${escapeHtml(project.defaultContext)} · ${project.defaultSessionMinutes}분</p>
                          </article>`,
                      )
                      .join('')}</div>
                  </section>`
                : '<p class="empty-copy">빠른 Todo를 추가하면 기본 목록이 자동으로 만들어집니다.</p>'
            }
            ${this.showDetailedForm && selectedProject && capacity > 0 ? this.chainFormHtml(selectedProject, capacity) : ''}
          </div>
        </details>
        ${capacity === 0 ? '<div class="capacity-note">활성 보드가 가득 찼습니다. NOW 1장과 NEXT 3장을 먼저 진행하세요.</div>' : ''}

        <section class="board-grid">
          <div class="panel board-column">
            <div class="section-heading"><div><p class="eyebrow">NEXT</p><h2>정해진 다음 순서</h2></div><span>${queue.length} / 3</span></div>
            <div class="card-list">
              ${
                queue.length
                  ? queue.map((card, index) => this.queueCardHtml(card, index, queue.length)).join('')
                  : '<p class="empty-copy">다음 할 일이 없습니다.</p>'
              }
            </div>
          </div>
          <div class="panel board-column">
            <div class="section-heading"><div><p class="eyebrow">WAITING</p><h2>기다리는 Todo</h2></div><span>${waiting.length}</span></div>
            <div class="card-list">
              ${
                waiting.length
                  ? waiting.map((card) => this.waitingCardHtml(card)).join('')
                  : '<p class="empty-copy">기다리는 할 일이 없습니다.</p>'
              }
            </div>
          </div>
        </section>
        <div id="edit-slot"></div>
      </main>
    `
    this.bindEvents(selectedProject, capacity)
    if (this.editingCardId) this.renderEditor()
  }

  projectFormHtml() {
    return `
      <section class="guided-wrap">
        <div class="guided-heading"><div><p class="eyebrow">PROJECT</p><h2>질문에 하나씩 답해 프로젝트 만들기</h2></div><button type="button" class="text-button" data-close-project>닫기</button></div>
        <guided-entry-form id="project-wizard"></guided-entry-form>
      </section>`
  }

  chainFormHtml(project, capacity) {
    if (this.chainStage === 'review' && this.chainDrafts.length) {
      return `
        <section class="guided-wrap chain-review">
          <p class="eyebrow">CHAIN READY</p>
          <h2>${this.chainDrafts.length}장의 실행 순서가 준비됐어요.</h2>
          <p>여기서 저장하거나, 자리가 남아 있으면 다음 상세 Todo를 이어서 작성하세요.</p>
          <div class="draft-list">
            ${this.chainDrafts
              .map(
                (draft, index) =>
                  `<div class="draft-card"><span>${index + 1}</span><strong>${escapeHtml(draft.title)}</strong></div>`,
              )
              .join('')}
          </div>
          <div class="review-actions">
            <button class="text-button danger-text" type="button" data-chain-reset>처음부터</button>
            <div>
              ${this.chainDrafts.length < capacity ? '<button class="button button-secondary" type="button" data-chain-more>+ 다음 Todo</button>' : ''}
              <button class="button button-primary" type="button" data-chain-save>이 순서로 저장</button>
            </div>
          </div>
        </section>`
    }
    return `
      <section class="guided-wrap">
        <div class="guided-heading"><div><p class="eyebrow">DETAIL · TODO ${this.chainDrafts.length + 1}</p><h2>지금은 이 Todo만 자세히 작성합니다.</h2></div><span>최대 ${capacity}개</span></div>
        <guided-entry-form id="card-wizard"></guided-entry-form>
      </section>`
  }

  queueCardHtml(card, index, length) {
    const quick = card.entryMode === 'QUICK'
    return `
      <article class="queue-card" data-card-id="${card.id}">
        <span class="queue-number">${index + 1}</span>
        <div class="queue-content">${quick ? '' : `<span class="label">${escapeHtml(projectName(this._state, card.projectId))}</span>`}<h3>${escapeHtml(card.title)}</h3>${quick ? '' : `<p>${escapeHtml(card.completionCriteria)}</p>`}</div>
        <div class="queue-actions">
          <button class="icon-button" data-move="-1" ${index === 0 ? 'disabled' : ''} aria-label="앞으로 이동">↑</button>
          <button class="icon-button" data-move="1" ${index === length - 1 ? 'disabled' : ''} aria-label="뒤로 이동">↓</button>
          <button class="text-button" data-edit>수정</button>
        </div>
      </article>`
  }

  waitingCardHtml(card) {
    const quick = card.entryMode === 'QUICK'
    return `
      <article class="queue-card waiting-card" data-card-id="${card.id}">
        <div class="queue-content">${quick ? '' : `<span class="label">${escapeHtml(projectName(this._state, card.projectId))}</span>`}<h3>${escapeHtml(card.title)}</h3>${quick ? '' : `<p>${escapeHtml(card.blockedReason)}</p>`}<small>${escapeHtml(card.waitingFor)}${card.reviewDate ? ` · ${formatDate(card.reviewDate)}` : ''}</small></div>
        <div class="queue-actions"><button class="text-button" data-edit>수정</button><button class="button button-secondary button-small" data-resume>대기 해제</button></div>
      </article>`
  }

  bindEvents(selectedProject, capacity) {
    this.shadowRoot.querySelector('#quick-add-form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      const form = event.currentTarget
      dispatchAction(this, 'quick-add', {
        title: form.elements.title.value,
        projectId: form.elements.projectId?.value ?? this.selectedProjectId,
      })
    })
    this.shadowRoot.querySelector('[data-toggle-detailed]')?.addEventListener('click', () => {
      this.showDetailedForm = !this.showDetailedForm
      this.showProjectForm = false
      this.chainDrafts = []
      this.chainStage = 'entry'
      this.render()
    })
    this.shadowRoot.querySelector('[data-toggle-project]')?.addEventListener('click', () => {
      this.showProjectForm = !this.showProjectForm
      this.showDetailedForm = false
      this.render()
    })
    this.shadowRoot.querySelector('[data-close-project]')?.addEventListener('click', () => {
      this.showProjectForm = false
      this.render()
    })
    this.mountProjectWizard()
    this.mountCardWizard(selectedProject)

    this.shadowRoot.querySelector('[data-chain-more]')?.addEventListener('click', () => {
      this.chainStage = 'entry'
      this.render()
    })
    this.shadowRoot.querySelector('[data-chain-reset]')?.addEventListener('click', () => {
      this.chainDrafts = []
      this.chainStage = 'entry'
      this.render()
    })
    this.shadowRoot.querySelector('[data-chain-save]')?.addEventListener('click', () => {
      dispatchAction(this, 'create-chain', {
        projectId: this.selectedProjectId,
        drafts: this.chainDrafts,
      })
    })
    const reviewPrimary =
      this.shadowRoot.querySelector('[data-chain-more]') ??
      this.shadowRoot.querySelector('[data-chain-save]')
    if (reviewPrimary) requestAnimationFrame(() => reviewPrimary.focus())
    if (!this.showProjectForm && !this.showDetailedForm && !this.editingCardId) {
      requestAnimationFrame(() => this.shadowRoot.querySelector('#quick-title')?.focus())
    }

    this.shadowRoot.querySelectorAll('.queue-card').forEach((element) => {
      const cardId = element.dataset.cardId
      element.querySelectorAll('[data-move]').forEach((button) =>
        button.addEventListener('click', () => dispatchAction(this, 'move-next', { cardId, direction: Number(button.dataset.move) })),
      )
      element.querySelector('[data-resume]')?.addEventListener('click', () => dispatchAction(this, 'resume', { cardId }))
      element.querySelector('[data-edit]')?.addEventListener('click', () => {
        this.editingCardId = cardId
        this.renderEditor()
      })
    })
  }

  mountProjectWizard() {
    const wizard = this.shadowRoot.querySelector('#project-wizard')
    if (!wizard) return
    wizard.config = {
      eyebrow: '새 프로젝트',
      submitLabel: '프로젝트 만들기',
      initialValues: {
        name: '',
        completionDefinition: '',
        deadline: '',
        qualityCriteria: '',
        defaultContext: '평일 저녁 식사 정리 직후 / 내 책상',
        defaultSessionMinutes: 50,
      },
      steps: [
        { name: 'name', label: '프로젝트 이름', question: '무엇을 끝내고 싶나요?', help: '짧고 다시 알아볼 수 있는 이름이면 충분해요.', placeholder: '토익 8주 계획', required: true },
        { name: 'completionDefinition', label: '완료 상태', question: '어떤 상태가 되면 끝났다고 말할 수 있나요?', help: '시간이 아니라 눈에 보이는 결과로 적어 주세요.', placeholder: '실전 모의고사 6회와 오답 재풀이 완료', type: 'textarea', required: true },
        { name: 'deadline', label: '완료 기한', question: '정해진 기한이 있나요?', help: '없으면 건너뛰어도 됩니다.', type: 'date', required: false },
        { name: 'qualityCriteria', label: '완료 판단 기준', question: '완료 여부를 무엇으로 확인할까요?', help: '숫자나 검사 기준이 있으면 판단이 쉬워져요.', placeholder: '오답 재풀이 정답률 85%', type: 'textarea', required: true },
        { name: 'defaultContext', label: '기본 실행 시점 / 장소', question: '언제, 어디서 시작할까요?', help: '매번 고르지 않도록 한 번만 기본값을 정합니다.', placeholder: '평일 저녁 식사 후 / 내 책상', required: true },
        { name: 'defaultSessionMinutes', label: '기본 세션', question: '한 번에 몇 분 실행할까요?', help: '처음에는 50분을 권장합니다.', type: 'number', min: 1, required: true },
      ],
    }
    wizard.addEventListener('guided-complete', (event) => {
      dispatchAction(this, 'create-project', {
        ...event.detail,
        defaultSessionMinutes: Number(event.detail.defaultSessionMinutes),
      })
      this.showProjectForm = false
    })
  }

  mountCardWizard(selectedProject) {
    const wizard = this.shadowRoot.querySelector('#card-wizard')
    if (!wizard || !selectedProject) return
    const includeProjectStep = this.chainDrafts.length === 0 && this._state.projects.length > 1
    const base = emptyDraft(selectedProject)
    if (this.chainDrafts.length) {
      base.previousResult = this.chainDrafts.at(-1).completionCriteria
    }
    const steps = []
    if (includeProjectStep) {
      steps.push({
        name: 'projectId',
        label: '프로젝트',
        question: '이 상세 Todo는 어느 프로젝트인가요?',
        help: '함께 작성하는 상세 Todo는 같은 프로젝트로 연결됩니다.',
        type: 'select',
        required: true,
        options: this._state.projects.map((project) => ({ value: project.id, label: project.name })),
      })
    }
    steps.push(
      { name: 'title', label: 'Todo 제목', question: '이번 세션에 끝낼 구체적인 결과는 무엇인가요?', help: '동사와 대상을 함께 적어 완료 가능한 크기로 만드세요.', placeholder: 'Part 5 오답 12개 원인 분류 후 재풀이', required: true },
      { name: 'resumeLocation', label: '이어받을 위치', question: '다음에 어디를 바로 열면 되나요?', help: '파일, 페이지, 문제 번호까지 적으면 찾는 시간이 사라져요.', placeholder: '오답노트 / Part 5 / 문제 1~12', required: true },
      { name: 'previousResult', label: '직전 결과', question: '지금까지 어떤 상태인가요?', help: '첫 Todo라면 현재 상태를, 다음 Todo라면 앞 결과를 적습니다.', placeholder: '12개 중 어휘 5, 문법 4, 시간 부족 3개', type: 'textarea', required: true },
      { name: 'firstAction', label: '첫 행동', question: '2분 안에 시작할 첫 행동은 무엇인가요?', help: '앱을 닫은 뒤 생각 없이 그대로 할 수 있어야 해요.', placeholder: '정답을 가리고 1번 문제부터 다시 푼다', type: 'textarea', required: true },
      { name: 'completionCriteria', label: '완료 조건', question: '어떤 상태면 이 Todo는 끝난 건가요?', help: '한 세션 안에 예/아니오로 판정할 수 있게 적어 주세요.', placeholder: '12개 재풀이와 오답 원인 태그가 끝난다', type: 'textarea', required: true },
      { name: 'verificationMethod', label: '검증 방법', question: '결과가 맞는지 어떻게 확인할까요?', help: '채점, 수치, 체크리스트처럼 외부 기준을 사용하세요.', placeholder: '재풀이 정답률과 문제당 시간을 기록한다', type: 'textarea', required: true },
      { name: 'detourAction', label: '우회 행동', question: '10분 막히면 무엇을 남길까요?', help: '조사만 하다 끝나지 않도록 가장 작은 우회 결과를 정합니다.', placeholder: '해설 규칙을 한 문장으로 적고 유사문제 1개 풀이', type: 'textarea', required: true },
      { name: 'executionContext', label: '실행 시점 / 장소', question: '이 Todo는 언제, 어디서 실행할까요?', help: '프로젝트 기본값을 그대로 써도 됩니다.', required: false },
      { name: 'expectedMinutes', label: '예상 세션', question: '몇 분 안에 끝낼 Todo인가요?', help: '프로젝트 기본 세션보다 크면 Todo를 나누는 편이 좋아요.', type: 'number', min: 1, required: true },
    )
    wizard.config = {
      eyebrow: `상세 Todo ${this.chainDrafts.length + 1}`,
      submitLabel: '이 Todo 완성',
      initialValues: { ...base, projectId: this.selectedProjectId },
      steps,
    }
    wizard.addEventListener('guided-step', (event) => {
      if (event.detail.name !== 'projectId') return
      this.selectedProjectId = event.detail.value
      const project = this._state.projects.find((candidate) => candidate.id === this.selectedProjectId)
      wizard.setValue('executionContext', project.defaultContext)
      wizard.setValue('expectedMinutes', project.defaultSessionMinutes)
    })
    wizard.addEventListener('guided-complete', (event) => {
      const { projectId, ...draft } = event.detail
      if (projectId) this.selectedProjectId = projectId
      this.chainDrafts.push({ ...draft, expectedMinutes: Number(draft.expectedMinutes) })
      this.chainStage = 'review'
      this.render()
    })
  }

  renderEditor() {
    const slot = this.shadowRoot.querySelector('#edit-slot')
    const card = this._state.cards.find((candidate) => candidate.id === this.editingCardId)
    if (!slot || !card) return
    const quick = card.entryMode === 'QUICK'
    slot.innerHTML = `
      <section class="guided-wrap edit-panel">
        <div class="guided-heading"><div><p class="eyebrow">EDIT TODO</p><h2>${quick ? '할 일 이름 수정' : '질문을 넘기며 상세 정보 수정'}</h2></div><button type="button" class="text-button" data-cancel-edit>닫기</button></div>
        <guided-entry-form id="edit-card-wizard"></guided-entry-form>
      </section>`
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' })
    slot.querySelector('[data-cancel-edit]').addEventListener('click', () => {
      this.editingCardId = null
      slot.innerHTML = ''
    })
    const wizard = slot.querySelector('#edit-card-wizard')
    wizard.config = {
      eyebrow: '할 일 수정',
      submitLabel: '수정 저장',
      initialValues: card,
      steps: quick
        ? [{ name: 'title', label: '할 일', question: '할 일 이름을 어떻게 바꿀까요?', required: true }]
        : this.cardDetailSteps(),
    }
    wizard.addEventListener('guided-complete', (event) => {
      const title = event.detail.title?.trim()
      const draft = quick
        ? {
            ...card,
            title,
            firstAction: title,
            completionCriteria: `${title} 완료`,
          }
        : { ...event.detail, expectedMinutes: Number(event.detail.expectedMinutes) }
      dispatchAction(this, 'update', {
        cardId: card.id,
        draft,
      })
      this.editingCardId = null
    })
  }

  cardDetailSteps() {
    return [
      { name: 'title', label: 'Todo 제목', question: '이번 세션의 결과를 더 분명하게 적어 볼까요?', placeholder: 'Part 5 오답 12개 원인 분류 후 재풀이', required: true },
      { name: 'resumeLocation', label: '이어받을 위치', question: '다음에 어디를 바로 열면 되나요?', placeholder: '오답노트 / Part 5 / 문제 1~12', required: true },
      { name: 'previousResult', label: '직전 결과', question: '지금까지 남은 결과는 무엇인가요?', type: 'textarea', required: true },
      { name: 'firstAction', label: '첫 행동', question: '2분 안에 실행할 첫 행동은 무엇인가요?', type: 'textarea', required: true },
      { name: 'completionCriteria', label: '완료 조건', question: '어떤 상태면 이 Todo가 끝난 건가요?', type: 'textarea', required: true },
      { name: 'verificationMethod', label: '검증 방법', question: '결과를 어떻게 확인할까요?', type: 'textarea', required: true },
      { name: 'detourAction', label: '우회 행동', question: '10분 막히면 무엇을 남길까요?', type: 'textarea', required: true },
      { name: 'executionContext', label: '실행 시점 / 장소', question: '언제, 어디서 실행할까요?', required: false },
      { name: 'expectedMinutes', label: '예상 세션', question: '몇 분 안에 끝낼까요?', type: 'number', min: 1, required: true },
    ]
  }
}

customElements.define('planning-view', PlanningView)
