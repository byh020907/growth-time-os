import { getBoardCapacity, getNextCards } from '../domain.js'
import {
  cardFieldsHtml,
  dispatchAction,
  emptyDraft,
  escapeHtml,
  formatDate,
  projectName,
  readCardDraft,
} from '../ui.js'

const styles = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
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
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field { display: grid; gap: 7px; align-content: start; }
  .field-wide { grid-column: 1 / -1; }
  .field span { color: var(--muted); font-size: 12px; font-weight: 700; }
  input, textarea, select { width: 100%; padding: 11px 12px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 9px; }
  textarea { min-height: 76px; resize: vertical; line-height: 1.5; }
  input:focus, textarea:focus, select:focus { outline: 2px solid #8bb29d; outline-offset: 1px; }
  .form-actions { margin-top: 18px; display: flex; justify-content: flex-end; gap: 10px; }
  .project-select { max-width: 430px; margin-bottom: 18px; }
  .card-fieldset { margin: 0 0 16px; padding: 20px; background: var(--white); border: 1px solid var(--line); border-radius: 14px; }
  .card-fieldset legend { width: 100%; padding: 0 6px; display: flex; justify-content: space-between; color: var(--green-dark); font-weight: 750; }
  .chain-controls { display: flex; align-items: center; gap: 12px; color: var(--muted); font-size: 12px; }
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
  @media (max-width: 760px) { .page-shell { margin-top: 34px; } .page-heading { flex-direction: column; } .form-grid, .board-grid { grid-template-columns: 1fr; } .field-wide { grid-column: auto; } .panel { padding: 19px; } .queue-card { grid-template-columns: auto 1fr; } .queue-actions { grid-column: 2; justify-content: flex-start; } .waiting-card { grid-template-columns: 1fr; } .waiting-card .queue-actions { grid-column: 1; } .chain-controls { align-items: flex-start; flex-direction: column; } }
`

class PlanningView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set state(value) {
    this._state = value
    if (this.showProjectForm === undefined) this.showProjectForm = value.projects.length === 0
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
          <div><p class="eyebrow">WEEKLY DECISION</p><h1>카드 사슬</h1><p>순서는 여기서 한 번만 정하고, 실행할 때는 NOW만 봅니다.</p></div>
          <button class="button button-secondary" data-toggle-project>+ 새 프로젝트</button>
        </div>
        <div id="project-form-slot">${this.showProjectForm ? this.projectFormHtml() : ''}</div>
        <section class="panel project-summary">
          <div class="section-heading"><div><p class="eyebrow">PROJECTS</p><h2>프로젝트 기준</h2></div><span>${state.projects.length}개</span></div>
          ${
            state.projects.length
              ? `<div class="project-grid">${state.projects
                  .map(
                    (project) => `
                      <article class="project-card">
                        <div><h3>${escapeHtml(project.name)}</h3>${project.deadline ? `<span class="date-chip">${escapeHtml(project.deadline)}</span>` : ''}</div>
                        <p><span class="label">완료 상태</span>${escapeHtml(project.completionDefinition)}</p>
                        <p><span class="label">기본 실행</span>${escapeHtml(project.defaultContext)} · ${project.defaultSessionMinutes}분</p>
                      </article>`,
                  )
                  .join('')}</div>`
              : '<p class="empty-copy">먼저 프로젝트 완료 상태와 기본 실행 환경을 정해 주세요.</p>'
          }
        </section>

        ${state.projects.length && capacity > 0 ? this.chainFormHtml(selectedProject, capacity) : ''}
        ${capacity === 0 ? '<div class="capacity-note">활성 보드가 가득 찼습니다. NOW 1장과 NEXT 3장을 먼저 진행하세요.</div>' : ''}

        <section class="board-grid">
          <div class="panel board-column">
            <div class="section-heading"><div><p class="eyebrow">NEXT</p><h2>정해진 다음 순서</h2></div><span>${queue.length} / 3</span></div>
            <div class="card-list">
              ${
                queue.length
                  ? queue.map((card, index) => this.queueCardHtml(card, index, queue.length)).join('')
                  : '<p class="empty-copy">NEXT 카드가 없습니다.</p>'
              }
            </div>
          </div>
          <div class="panel board-column">
            <div class="section-heading"><div><p class="eyebrow">WAITING</p><h2>외부 의존 카드</h2></div><span>${waiting.length}</span></div>
            <div class="card-list">
              ${
                waiting.length
                  ? waiting.map((card) => this.waitingCardHtml(card)).join('')
                  : '<p class="empty-copy">기다리는 카드가 없습니다.</p>'
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
      <form class="panel form-panel" id="project-form">
        <div class="section-heading"><div><p class="eyebrow">PROJECT</p><h2>프로젝트 기준을 한 번만 정하기</h2></div><button type="button" class="text-button" data-close-project>닫기</button></div>
        <div class="form-grid">
          <label class="field"><span>프로젝트 이름 *</span><input name="name" required /></label>
          <label class="field"><span>완료 기한</span><input name="deadline" type="date" /></label>
          <label class="field field-wide"><span>완료 상태 *</span><textarea name="completionDefinition" required placeholder="무엇이 존재하면 이 프로젝트가 끝나는가?"></textarea></label>
          <label class="field field-wide"><span>완료 판단 기준 *</span><textarea name="qualityCriteria" required placeholder="품질이나 수량을 무엇으로 확인할 것인가?"></textarea></label>
          <label class="field"><span>기본 실행 시점 / 장소 *</span><input name="defaultContext" required value="평일 저녁 식사 정리 직후 / 내 책상" /></label>
          <label class="field"><span>기본 세션 (분)</span><input name="defaultSessionMinutes" type="number" min="1" value="50" required /></label>
        </div>
        <div class="form-actions"><button class="button button-primary" type="submit">프로젝트 만들기</button></div>
      </form>`
  }

  chainFormHtml(project, capacity) {
    return `
      <form class="panel chain-form" id="chain-form">
        <div class="section-heading">
          <div><p class="eyebrow">CHAIN</p><h2>실행 순서를 카드로 고정하기</h2></div>
          <span>추가 가능 ${capacity}장</span>
        </div>
        <label class="field project-select"><span>프로젝트</span><select name="projectId">${this._state.projects
          .map((candidate) => `<option value="${candidate.id}" ${candidate.id === project.id ? 'selected' : ''}>${escapeHtml(candidate.name)}</option>`)
          .join('')}</select></label>
        <div id="chain-cards">
          ${this.cardFieldsetHtml(0, emptyDraft(project), true)}
        </div>
        <div class="chain-controls">
          <button class="button button-secondary" type="button" data-add-card>+ 다음 카드 연결</button>
          <span>첫 카드는 빈 NOW로, 이후 카드는 NEXT 꼬리로 들어갑니다.</span>
        </div>
        <div class="form-actions"><button class="button button-primary" type="submit">카드 사슬 저장</button></div>
      </form>`
  }

  cardFieldsetHtml(index, draft, first = false) {
    return `
      <fieldset class="card-fieldset" data-card-index="${index}">
        <legend><span>${first ? '첫 카드' : `다음 ${index}`}</span>${first ? '' : '<button type="button" class="text-button danger-text" data-remove-card>제거</button>'}</legend>
        ${cardFieldsHtml(draft, `card-${index}-`)}
      </fieldset>`
  }

  queueCardHtml(card, index, length) {
    return `
      <article class="queue-card" data-card-id="${card.id}">
        <span class="queue-number">${index + 1}</span>
        <div class="queue-content"><span class="label">${escapeHtml(projectName(this._state, card.projectId))}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.completionCriteria)}</p></div>
        <div class="queue-actions">
          <button class="icon-button" data-move="-1" ${index === 0 ? 'disabled' : ''} aria-label="앞으로 이동">↑</button>
          <button class="icon-button" data-move="1" ${index === length - 1 ? 'disabled' : ''} aria-label="뒤로 이동">↓</button>
          <button class="text-button" data-edit>수정</button>
        </div>
      </article>`
  }

  waitingCardHtml(card) {
    return `
      <article class="queue-card waiting-card" data-card-id="${card.id}">
        <div class="queue-content"><span class="label">${escapeHtml(projectName(this._state, card.projectId))}</span><h3>${escapeHtml(card.title)}</h3><p>${escapeHtml(card.blockedReason)}</p><small>${escapeHtml(card.waitingFor)}${card.reviewDate ? ` · ${formatDate(card.reviewDate)}` : ''}</small></div>
        <div class="queue-actions"><button class="text-button" data-edit>수정</button><button class="button button-secondary button-small" data-resume>대기 해제</button></div>
      </article>`
  }

  bindEvents(selectedProject, capacity) {
    this.shadowRoot.querySelector('[data-toggle-project]')?.addEventListener('click', () => {
      this.showProjectForm = !this.showProjectForm
      this.render()
    })
    this.shadowRoot.querySelector('[data-close-project]')?.addEventListener('click', () => {
      this.showProjectForm = false
      this.render()
    })
    this.shadowRoot.querySelector('#project-form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      const form = event.currentTarget
      dispatchAction(this, 'create-project', {
        name: form.elements.name.value,
        deadline: form.elements.deadline.value,
        completionDefinition: form.elements.completionDefinition.value,
        qualityCriteria: form.elements.qualityCriteria.value,
        defaultContext: form.elements.defaultContext.value,
        defaultSessionMinutes: Number(form.elements.defaultSessionMinutes.value),
      })
      this.showProjectForm = false
    })

    const chainForm = this.shadowRoot.querySelector('#chain-form')
    chainForm?.elements.projectId.addEventListener('change', (event) => {
      this.selectedProjectId = event.target.value
      const project = this._state.projects.find((candidate) => candidate.id === this.selectedProjectId)
      chainForm.querySelectorAll('[name$="executionContext"]').forEach((input) => {
        if (!input.value || input.value === selectedProject.defaultContext) input.value = project.defaultContext
      })
      chainForm.querySelectorAll('[name$="expectedMinutes"]').forEach((input) => {
        if (!input.value || Number(input.value) === selectedProject.defaultSessionMinutes) input.value = project.defaultSessionMinutes
      })
    })
    chainForm?.querySelector('[data-add-card]')?.addEventListener('click', () => {
      const container = chainForm.querySelector('#chain-cards')
      const count = container.querySelectorAll('[data-card-index]').length
      if (count >= capacity) return
      const indexes = [...container.querySelectorAll('[data-card-index]')].map((node) => Number(node.dataset.cardIndex))
      const index = Math.max(...indexes) + 1
      const project = this._state.projects.find((candidate) => candidate.id === chainForm.elements.projectId.value)
      container.insertAdjacentHTML('beforeend', this.cardFieldsetHtml(index, emptyDraft(project)))
      if (count + 1 >= capacity) chainForm.querySelector('[data-add-card]').disabled = true
    })
    chainForm?.querySelector('#chain-cards')?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-remove-card]')
      if (!button) return
      button.closest('[data-card-index]').remove()
      chainForm.querySelector('[data-add-card]').disabled = false
    })
    chainForm?.addEventListener('submit', (event) => {
      event.preventDefault()
      const form = event.currentTarget
      const drafts = [...form.querySelectorAll('[data-card-index]')].map((fieldset) =>
        readCardDraft(form, `card-${fieldset.dataset.cardIndex}-`),
      )
      dispatchAction(this, 'create-chain', { projectId: form.elements.projectId.value, drafts })
    })

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

  renderEditor() {
    const slot = this.shadowRoot.querySelector('#edit-slot')
    const card = this._state.cards.find((candidate) => candidate.id === this.editingCardId)
    if (!slot || !card) return
    slot.innerHTML = `
      <form class="panel form-panel edit-panel" id="edit-card-form">
        <div class="section-heading"><div><p class="eyebrow">EDIT CARD</p><h2>재개 정보를 구체화하기</h2></div><button type="button" class="text-button" data-cancel-edit>닫기</button></div>
        ${cardFieldsHtml(card)}
        <div class="form-actions"><button class="button button-primary" type="submit">카드 수정</button></div>
      </form>`
    slot.scrollIntoView({ behavior: 'smooth', block: 'start' })
    slot.querySelector('[data-cancel-edit]').addEventListener('click', () => {
      this.editingCardId = null
      slot.innerHTML = ''
    })
    slot.querySelector('form').addEventListener('submit', (event) => {
      event.preventDefault()
      dispatchAction(this, 'update', { cardId: card.id, draft: readCardDraft(event.currentTarget) })
      this.editingCardId = null
    })
  }
}

customElements.define('planning-view', PlanningView)
