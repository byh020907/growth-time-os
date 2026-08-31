import { getWeeklySummary } from '../domain.js'
import { escapeHtml, formatDate, projectName } from '../ui.js'

const styles = `
  :host { display: block; }
  * { box-sizing: border-box; }
  .page-shell { width: min(1060px, calc(100% - 32px)); margin: 50px auto 0; }
  .page-heading { margin-bottom: 28px; }
  .page-heading h1 { margin: 7px 0 8px; font: 600 clamp(34px, 5vw, 54px)/1.1 var(--font-serif); letter-spacing: -.035em; }
  .page-heading p:last-child { margin: 0; color: var(--muted); }
  .eyebrow { margin: 0 0 7px; color: var(--green); font: 700 11px/1.3 var(--font-mono); letter-spacing: .13em; }
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
  .metrics-grid article { padding: 22px; display: grid; gap: 5px; background: var(--white); border: 1px solid var(--line); border-radius: 15px; }
  .metrics-grid article > span:not(.metric-value) { font-weight: 750; }
  .metric-value { font: 600 38px/1 var(--font-serif); letter-spacing: -.04em; }
  .metrics-grid small { color: var(--muted); line-height: 1.45; }
  .panel { margin-top: 18px; padding: 26px; background: rgb(255 253 248 / 82%); border: 1px solid var(--line); border-radius: 18px; }
  .section-heading { margin-bottom: 18px; display: flex; justify-content: space-between; gap: 20px; }
  .section-heading h2 { margin: 0; }
  .section-heading > span { color: var(--muted); font: 700 12px/1.3 var(--font-mono); }
  .done-list { display: grid; gap: 10px; }
  .done-list article { padding: 18px; display: grid; grid-template-columns: 1fr 1.2fr; gap: 20px; background: var(--paper); border: 1px solid var(--line); border-radius: 12px; }
  .done-list h3 { margin: 6px 0 0; }
  .done-list p { margin: 0; line-height: 1.6; }
  .label { display: block; color: var(--muted); font: 700 10px/1.2 var(--font-mono); letter-spacing: .06em; }
  .empty-copy { color: var(--muted); }
  @media (max-width: 760px) { .page-shell { margin-top: 34px; } .metrics-grid { grid-template-columns: 1fr 1fr; } .done-list article { grid-template-columns: 1fr; gap: 10px; } }
  @media (max-width: 440px) { .metrics-grid { grid-template-columns: 1fr; } }
`

class ReviewView extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set state(value) {
    this._state = value
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const state = this._state
    if (!state) return
    const summary = getWeeklySummary(state)
    const done = state.cards
      .filter((card) => card.status === 'DONE')
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
    this.shadowRoot.innerHTML = `<style>${styles}</style>
      <main class="page-shell">
        <div class="page-heading"><div><p class="eyebrow">LAST 7 DAYS</p><h1>실행 기록</h1><p>기분 대신 시작과 산출물 증거만 봅니다.</p></div></div>
        <section class="metrics-grid">
          <article><span class="metric-value">${summary.startRate}%</span><span>시작률</span><small>${summary.starts} / ${summary.opportunities} 실행 기회</small></article>
          <article><span class="metric-value">${summary.completedOutputs}</span><span>완료 산출물</span><small>완료 표시가 남은 Todo</small></article>
          <article><span class="metric-value">${summary.focusMinutes}</span><span>집중 분</span><small>완료·대기 처리 기록</small></article>
          <article><span class="metric-value">${summary.waitingTransitions}</span><span>대기 전환</span><small>기다리는 Todo</small></article>
        </section>
        <section class="panel done-panel">
          <div class="section-heading"><div><p class="eyebrow">DONE</p><h2>완료 증거</h2></div><span>${done.length}</span></div>
          <div class="done-list">
            ${
              done.length
                ? done
                    .map(
                      (card) => `
                        <article>
                          <div><span class="label">${escapeHtml(projectName(state, card.projectId))} · ${formatDate(card.completedAt)}</span><h3>${escapeHtml(card.title)}</h3></div>
                          <p>${escapeHtml(card.completionEvidence)}</p>
                        </article>`,
                    )
                    .join('')
                : '<p class="empty-copy">아직 완료 증거가 없습니다.</p>'
            }
          </div>
        </section>
      </main>`
  }
}

customElements.define('review-view', ReviewView)
