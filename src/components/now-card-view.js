import { dispatchAction, escapeHtml } from '../ui.js'
import './guided-entry-form.js'

const styles = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button, input, textarea { font: inherit; }
  .now-shell { width: min(920px, calc(100% - 32px)); margin: 64px auto 0; }
  .now-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; color: var(--muted); font-size: 13px; }
  .status-pill { padding: 6px 10px; color: var(--green-dark); background: var(--green-soft); border-radius: 999px; font: 700 11px/1 var(--font-mono); letter-spacing: .08em; }
  h1 { max-width: 820px; margin: 20px 0 30px; font: 600 clamp(34px, 5vw, 60px)/1.1 var(--font-serif); letter-spacing: -.035em; }
  h2, p { margin-top: 0; }
  .quick-hint { max-width: 650px; margin: -8px 0 28px; color: var(--muted); font-size: 15px; line-height: 1.7; }
  .start-strip { display: grid; grid-template-columns: 1.35fr 1fr; gap: 1px; overflow: hidden; background: var(--line); border: 1px solid var(--line); border-radius: 16px; }
  .start-strip > div { padding: 22px; background: var(--white); }
  .start-strip strong, .start-strip p, .label { display: block; }
  .start-strip strong { margin-top: 8px; font-size: 15px; }
  .start-strip p { margin: 8px 0 0; color: var(--muted); font-size: 13px; }
  .label { margin-bottom: 7px; color: var(--muted); font: 700 10px/1.2 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
  .first-action { margin: 28px 0; padding: clamp(26px, 5vw, 48px); display: flex; gap: 26px; color: var(--white); background: var(--ink); border-radius: 22px; box-shadow: var(--shadow); }
  .step-number { color: #8fb29f; font: 700 17px/1 var(--font-mono); }
  .eyebrow { margin: 0 0 10px; color: var(--green); font: 700 11px/1.3 var(--font-mono); letter-spacing: .13em; }
  .first-action .eyebrow { color: #98c6ad; }
  .first-action h2 { margin-bottom: 12px; font-size: clamp(23px, 3.4vw, 36px); line-height: 1.35; }
  .first-action p:last-child { margin: 0; color: #bdc9c1; font-size: 13px; }
  .criteria-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .criteria-grid section { padding: 22px; background: rgb(255 253 248 / 72%); border: 1px solid var(--line); border-radius: 15px; }
  .criteria-grid p { margin: 0; line-height: 1.65; }
  .criteria-grid .detour { background: var(--amber-soft); border-color: #e4d29a; }
  .now-actions { margin: 24px 0 0; display: flex; align-items: center; flex-wrap: wrap; gap: 10px; }
  .button, .text-button { border: 0; cursor: pointer; }
  .button { padding: 11px 16px; border-radius: 11px; font-weight: 700; text-decoration: none; }
  .button-large { padding: 14px 21px; }
  .button-primary { color: var(--white); background: var(--ink); }
  .button-success { color: var(--white); background: var(--green); }
  .button-secondary { color: var(--ink); background: var(--paper-deep); border: 1px solid var(--line); }
  .text-button { padding: 8px; color: var(--muted); background: transparent; }
  .danger-text { color: var(--red); }
  .started-mark { padding: 10px 14px; color: var(--green-dark); background: var(--green-soft); border-radius: 10px; font-size: 13px; font-weight: 700; }
  .action-panel { margin-top: 20px; padding: clamp(22px, 4vw, 36px); background: var(--white); border: 1px solid var(--line); border-radius: 18px; box-shadow: var(--shadow); }
  .success-panel { border-top: 4px solid var(--green); }
  .waiting-panel { border-top: 4px solid #bb8c2f; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
  .field { display: grid; gap: 7px; align-content: start; }
  .field-wide { grid-column: 1 / -1; }
  .small-field { max-width: 220px; margin-top: 15px; }
  .field span { color: var(--muted); font-size: 12px; font-weight: 700; }
  input, textarea { width: 100%; padding: 11px 12px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 9px; }
  textarea { min-height: 76px; resize: vertical; line-height: 1.5; }
  input:focus, textarea:focus { outline: 2px solid #8bb29d; outline-offset: 1px; }
  .form-actions { margin-top: 18px; display: flex; justify-content: flex-end; align-items: center; gap: 10px; }
  .handoff-guided { margin-top: 20px; }
  .handoff-heading { margin-bottom: 12px; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
  .handoff-heading h2 { margin: 4px 0 0; }
  .empty-now { min-height: 60vh; display: grid; place-content: center; justify-items: start; }
  .empty-now > p:not(.eyebrow) { max-width: 540px; color: var(--muted); line-height: 1.7; }
  @media (max-width: 720px) { .now-shell { margin-top: 36px; } .start-strip, .criteria-grid, .form-grid { grid-template-columns: 1fr; } .field-wide { grid-column: auto; } .first-action { flex-direction: column; } }
`

class NowCardView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set state(value) {
    this._state = value
    this.render()
  }

  connectedCallback() {
    this.mode = 'none'
    this.render()
  }

  render() {
    const state = this._state
    if (!state) return
    const card = state.cards.find((candidate) => candidate.status === 'NOW')
    const project = state.projects.find((candidate) => candidate.id === card?.projectId)
    if (!card || !project) {
      this.shadowRoot.innerHTML = `<style>${styles}</style>
        <main class="now-shell empty-now">
          <p class="eyebrow">NOW · 0 / 1</p>
          <h1>지금 실행할 할 일이 없습니다.</h1>
          <p>할 일을 한 줄 추가하면 바로 NOW에서 시작할 수 있어요.</p>
          <a class="button button-primary" href="#plan">할 일 추가</a>
        </main>
      `
      return
    }

    const run = state.runs.find(
      (candidate) => candidate.cardId === card.id && candidate.outcome === 'ACTIVE',
    )
    const quick = card.entryMode === 'QUICK'
    this.shadowRoot.innerHTML = `<style>${styles}</style>
      <main class="now-shell">
        <div class="now-meta">
          <span class="status-pill">NOW · 1 / 1</span>
          ${quick ? '' : `<span>${escapeHtml(project.name)}</span><span>${card.expectedMinutes}분 세션</span>`}
        </div>
        <h1>${escapeHtml(card.title)}</h1>
        ${
          quick
            ? '<p class="quick-hint">이 할 일부터 시작하세요. 끝나면 완료, 아니면 계속이나 대기를 선택합니다.</p>'
            : `<div class="start-strip">
                <div>
                  <span class="label">이어받을 위치</span>
                  <strong>${escapeHtml(card.resumeLocation)}</strong>
                  ${card.previousResult ? `<p>${escapeHtml(card.previousResult)}</p>` : ''}
                </div>
                <div>
                  <span class="label">실행 시점 / 장소</span>
                  <strong>${escapeHtml(card.executionContext || project.defaultContext)}</strong>
                </div>
              </div>
              <section class="first-action">
                <span class="step-number">01</span>
                <div>
                  <p class="eyebrow">FIRST ACTION</p>
                  <h2>${escapeHtml(card.firstAction)}</h2>
                  <p>생각을 더 붙이지 말고 이 행동부터 실행하세요.</p>
                </div>
              </section>
              <div class="criteria-grid">
                <section><span class="label">완료 조건</span><p>${escapeHtml(card.completionCriteria)}</p></section>
                <section><span class="label">검증 방법</span><p>${escapeHtml(card.verificationMethod)}</p></section>
                <section class="detour"><span class="label">10분 막히면 그대로 실행</span><p>${escapeHtml(card.detourAction)}</p></section>
              </div>`
        }
        <div class="now-actions">
          ${
            quick
              ? ''
              : run?.startedAt
              ? `<span class="started-mark">시작됨 · ${new Date(run.startedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>`
              : '<button class="button button-primary button-large" data-action="start">시작</button>'
          }
          <button class="button button-success" data-mode="complete">완료</button>
          <button class="button button-secondary" data-mode="handoff">${quick ? '다음에 계속' : '미완료 · 인계 업데이트'}</button>
          <button class="text-button danger-text" data-mode="waiting">${quick ? '대기' : '우회도 불가능 → 대기'}</button>
        </div>
        <div id="action-slot"></div>
      </main>
    `
    this.shadowRoot.querySelector('[data-action="start"]')?.addEventListener('click', () =>
      dispatchAction(this, 'start', { cardId: card.id }),
    )
    this.shadowRoot.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', () => {
        if (quick && button.dataset.mode === 'complete') {
          dispatchAction(this, 'complete', { cardId: card.id, evidence: '완료 표시', focusMinutes: 0 })
          return
        }
        if (quick && button.dataset.mode === 'handoff') {
          dispatchAction(this, 'handoff', { cardId: card.id, draft: card, focusMinutes: 0 })
          return
        }
        this.mode = button.dataset.mode
        this.renderAction(card, quick)
      })
    })
    if (this.mode !== 'none') this.renderAction(card, quick)
  }

  renderAction(card, quick = card.entryMode === 'QUICK') {
    const slot = this.shadowRoot.querySelector('#action-slot')
    if (!slot) return
    if (this.mode === 'complete') {
      slot.innerHTML = `
        <form class="action-panel success-panel" data-form="complete">
          <div><p class="eyebrow">COMPLETE</p><h2>증거를 남기면 다음 Todo가 자동으로 올라옵니다.</h2></div>
          <label class="field field-wide"><span>완료 증거 *</span><textarea name="evidence" required autofocus placeholder="채점 결과, 정답률, 오답 원인 태그 등"></textarea></label>
          <label class="field small-field"><span>실제 집중 시간 (분)</span><input name="focusMinutes" type="number" min="0" value="0" required /></label>
          <div class="form-actions"><button type="button" class="text-button" data-cancel>취소</button><button class="button button-success" type="submit">완료하고 다음 Todo 열기</button></div>
        </form>`
    } else if (this.mode === 'waiting') {
      slot.innerHTML = quick
        ? `<form class="action-panel waiting-panel" data-form="waiting-quick">
            <div><p class="eyebrow">WAITING</p><h2>무엇을 기다리나요?</h2></div>
            <label class="field field-wide"><span>기다리는 대상 *</span><input name="waitingFor" required autofocus placeholder="답변, 자료, 준비물" /></label>
            <div class="form-actions"><button type="button" class="text-button" data-cancel>취소</button><button class="button button-primary" type="submit">대기로 이동</button></div>
          </form>`
        : `<form class="action-panel waiting-panel" data-form="waiting">
            <div><p class="eyebrow">WAITING</p><h2>우회 행동도 불가능할 때만 대기로 보냅니다.</h2></div>
            <label class="field field-wide"><span>막힌 이유 *</span><textarea name="reason" required autofocus></textarea></label>
            <label class="field"><span>기다리는 대상 *</span><input name="waitingFor" required placeholder="답변, 자료, 피드백" /></label>
            <label class="field"><span>다시 확인할 날짜</span><input name="reviewDate" type="date" /></label>
            <label class="field small-field"><span>실제 집중 시간 (분)</span><input name="focusMinutes" type="number" min="0" value="0" required /></label>
            <div class="form-actions"><button type="button" class="text-button" data-cancel>취소</button><button class="button button-primary" type="submit">대기로 보내고 다음 Todo 열기</button></div>
          </form>`
    } else if (this.mode === 'handoff') {
      slot.innerHTML = `
        <section class="handoff-guided">
          <div class="handoff-heading"><div><p class="eyebrow">CONTINUE</p><h2>남은 일을 질문 하나씩 다시 자릅니다.</h2></div><button type="button" class="text-button" data-cancel>취소</button></div>
          <guided-entry-form id="handoff-wizard"></guided-entry-form>
        </section>`
    }
    slot.querySelector('[data-cancel]')?.addEventListener('click', () => {
      this.mode = 'none'
      slot.innerHTML = ''
    })
    requestAnimationFrame(() => slot.querySelector('[autofocus]')?.focus())
    slot.querySelector('form')?.addEventListener('submit', (event) => {
      event.preventDefault()
      const form = event.currentTarget
      if (form.dataset.form === 'complete') {
        dispatchAction(this, 'complete', {
          cardId: card.id,
          evidence: form.elements.evidence.value,
          focusMinutes: Number(form.elements.focusMinutes.value),
        })
      } else if (form.dataset.form === 'waiting') {
        dispatchAction(this, 'wait', {
          cardId: card.id,
          reason: form.elements.reason.value,
          waitingFor: form.elements.waitingFor.value,
          reviewDate: form.elements.reviewDate.value,
          focusMinutes: Number(form.elements.focusMinutes.value),
        })
      } else if (form.dataset.form === 'waiting-quick') {
        const waitingFor = form.elements.waitingFor.value
        dispatchAction(this, 'wait', {
          cardId: card.id,
          reason: waitingFor,
          waitingFor,
          reviewDate: '',
          focusMinutes: 0,
        })
      }
    })
    const wizard = slot.querySelector('#handoff-wizard')
    if (wizard) {
      wizard.config = {
        eyebrow: 'NOW 인계',
        submitLabel: 'NOW 그대로 연결',
        initialValues: { ...card, focusMinutes: 0 },
        steps: [
          { name: 'title', label: 'Todo 제목', question: '남은 결과를 한 세션 크기로 다시 적어 볼까요?', required: true },
          { name: 'resumeLocation', label: '이어받을 위치', question: '다음에 어디를 바로 열면 되나요?', required: true },
          { name: 'previousResult', label: '이번 결과', question: '이번 세션에서 어디까지 했나요?', type: 'textarea', required: true },
          { name: 'firstAction', label: '다음 첫 행동', question: '다음 세션에 2분 안에 할 첫 행동은 무엇인가요?', type: 'textarea', required: true },
          { name: 'completionCriteria', label: '완료 조건', question: '어떤 상태면 남은 Todo가 끝난 건가요?', type: 'textarea', required: true },
          { name: 'verificationMethod', label: '검증 방법', question: '결과를 어떻게 확인할까요?', type: 'textarea', required: true },
          { name: 'detourAction', label: '우회 행동', question: '다음에도 10분 막히면 무엇을 남길까요?', type: 'textarea', required: true },
          { name: 'executionContext', label: '실행 시점 / 장소', question: '언제, 어디서 이어갈까요?', required: false },
          { name: 'expectedMinutes', label: '예상 세션', question: '남은 일을 몇 분 안에 끝낼까요?', type: 'number', min: 1, required: true },
          { name: 'focusMinutes', label: '이번 집중 시간', question: '이번 세션에는 실제로 몇 분 집중했나요?', type: 'number', min: 0, required: true },
        ],
      }
      wizard.addEventListener('guided-complete', (event) => {
        const { focusMinutes, ...draft } = event.detail
        dispatchAction(this, 'handoff', {
          cardId: card.id,
          draft: { ...draft, expectedMinutes: Number(draft.expectedMinutes) },
          focusMinutes: Number(focusMinutes),
        })
      })
    }
  }
}

customElements.define('now-card-view', NowCardView)
