class AppHeader extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
  }

  set view(value) {
    this._view = value
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  render() {
    const view = this._view ?? 'now'
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; position: sticky; top: 0; z-index: 20; }
        .app-header { min-height: 72px; padding: 0 4vw; display: flex; align-items: center; justify-content: space-between; gap: 24px; background: color-mix(in srgb, var(--paper) 92%, transparent); border-bottom: 1px solid var(--line); backdrop-filter: blur(16px); }
        .brand { display: inline-flex; align-items: center; gap: 12px; padding: 0; color: var(--ink); text-align: left; text-decoration: none; }
        .brand-mark { width: 38px; height: 38px; display: grid; place-items: center; color: var(--paper); background: var(--ink); border-radius: 11px; font: 700 13px/1 var(--font-mono); letter-spacing: .06em; }
        .brand strong, .brand small { display: block; }
        .brand strong { font: 700 15px/1.3 var(--font-sans); }
        .brand small { margin-top: 2px; color: var(--muted); font-size: 11px; }
        nav { display: flex; align-items: center; gap: 4px; padding: 4px; background: var(--paper-deep); border-radius: 12px; }
        nav a { padding: 9px 15px; color: var(--muted); background: transparent; border-radius: 9px; cursor: pointer; font-weight: 650; text-align: center; text-decoration: none; }
        nav a:hover { color: var(--ink); }
        nav a.active { color: var(--ink); background: var(--white); box-shadow: 0 1px 5px rgb(30 35 30 / 8%); }
        @media (max-width: 640px) { .app-header { padding: 10px 16px; align-items: flex-start; flex-direction: column; gap: 10px; } .brand small { display: none; } nav { width: 100%; } nav a { flex: 1; } }
      </style>
      <header class="app-header">
        <a class="brand" href="#now" aria-label="지금 할 일로 이동">
          <span class="brand-mark">GT</span>
          <span><strong>Growth Time OS</strong><small>결정 없이, 한 장부터</small></span>
        </a>
        <nav aria-label="주요 화면">
          <a href="#now" class="${view === 'now' ? 'active' : ''}">지금</a>
          <a href="#plan" class="${view === 'plan' ? 'active' : ''}">할 일</a>
          <a href="#review" class="${view === 'review' ? 'active' : ''}">7일 기록</a>
        </nav>
      </header>
    `
  }
}

customElements.define('app-header', AppHeader)
