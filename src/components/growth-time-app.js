import {
  completeNowCard,
  createCardChain,
  createProject,
  handoffNowCard,
  moveNextCard,
  resumeWaitingCard,
  startNowCard,
  updateCardDetails,
  waitNowCard,
} from '../domain.js'
import { loadState, saveState } from '../storage.js'
import './app-header.js'
import './now-card-view.js'
import './planning-view.js'
import './review-view.js'

class GrowthTimeApp extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.state = loadState()
    this.view = ['now', 'plan', 'review'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'now'
    this.message = ''
    this.messageType = 'success'
  }

  connectedCallback() {
    if (!this.hashListener) {
      this.hashListener = () => this.navigate(location.hash.slice(1))
      window.addEventListener('hashchange', this.hashListener)
    }
    this.render()
  }

  disconnectedCallback() {
    if (this.hashListener) window.removeEventListener('hashchange', this.hashListener)
    this.hashListener = null
  }

  navigate(view) {
    this.view = ['now', 'plan', 'review'].includes(view) ? view : 'now'
    this.message = ''
    this.render()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  commit(transform, message) {
    try {
      const next = transform(this.state)
      saveState(next)
      this.state = next
      this.message = message
      this.messageType = 'success'
      this.render()
    } catch (error) {
      this.message = error instanceof Error ? error.message : '처리하지 못했습니다.'
      this.messageType = 'error'
      this.renderMessage()
    }
  }

  handleAction({ type, payload }) {
    const actions = {
      'create-project': () => this.commit((state) => createProject(state, payload).state, '프로젝트를 만들었습니다.'),
      'create-chain': () => this.commit((state) => createCardChain(state, payload.projectId, payload.drafts), '카드 사슬을 실행 순서에 연결했습니다.'),
      start: () => this.commit((state) => startNowCard(state, payload.cardId), '시작을 기록했습니다.'),
      complete: () => this.commit((state) => completeNowCard(state, payload.cardId, payload.evidence, payload.focusMinutes), '완료 증거를 저장하고 다음 카드를 열었습니다.'),
      wait: () => this.commit((state) => waitNowCard(state, payload.cardId, payload), '카드를 대기로 보내고 다음 카드를 열었습니다.'),
      resume: () => this.commit((state) => resumeWaitingCard(state, payload.cardId), '대기 카드를 실행 순서에 다시 연결했습니다.'),
      update: () => this.commit((state) => updateCardDetails(state, payload.cardId, payload.draft), '카드 인계 정보를 갱신했습니다.'),
      handoff: () => this.commit((state) => handoffNowCard(state, payload.cardId, payload.draft, payload.focusMinutes), '미완료 기록을 남기고 같은 NOW를 다음 세션으로 연결했습니다.'),
      'move-next': () => this.commit((state) => moveNextCard(state, payload.cardId, payload.direction), 'NEXT 순서를 바꿨습니다.'),
    }
    actions[type]?.()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; min-height: 100vh; }
        .toast { position: fixed; top: 84px; left: 50%; z-index: 50; max-width: min(90vw, 680px); padding: 12px 18px; border: 1px solid; border-radius: 12px; box-shadow: var(--shadow); transform: translateX(-50%); font-size: 14px; font-weight: 650; }
        .toast.success { color: #194d39; background: #e7f4ed; border-color: #b7d8c5; }
        .toast.error { color: #7b2929; background: #faeaea; border-color: #e5bbbb; }
        footer { max-width: 1180px; margin: 52px auto 0; padding: 24px 24px 36px; display: flex; justify-content: space-between; gap: 20px; color: var(--muted); border-top: 1px solid var(--line); font-size: 12px; }
        footer span:first-child { color: var(--ink); font-weight: 700; }
        @media (max-width: 640px) { footer { margin-top: 24px; flex-direction: column; } .toast { top: 122px; } }
      </style>
      <app-header></app-header>
      ${this.message ? `<div class="toast ${this.messageType}" role="status">${this.escape(this.message)}</div>` : ''}
      <div id="view"></div>
      <footer><span>Growth Time OS</span><span>데이터는 이 브라우저에만 저장됩니다.</span></footer>
    `
    const header = this.shadowRoot.querySelector('app-header')
    header.view = this.view
    const element = document.createElement(
      this.view === 'plan' ? 'planning-view' : this.view === 'review' ? 'review-view' : 'now-card-view',
    )
    element.addEventListener('domain-action', (event) => this.handleAction(event.detail))
    element.state = this.state
    this.shadowRoot.querySelector('#view').replaceChildren(element)
    this.renderMessage()
  }

  renderMessage() {
    this.shadowRoot.querySelector('.toast')?.remove()
    if (!this.message) return
    const toast = document.createElement('div')
    toast.className = `toast ${this.messageType}`
    toast.setAttribute('role', 'status')
    toast.textContent = this.message
    this.shadowRoot.querySelector('app-header')?.after(toast)
  }

  escape(value) {
    const node = document.createElement('span')
    node.textContent = value
    return node.innerHTML
  }
}

customElements.define('growth-time-app', GrowthTimeApp)
