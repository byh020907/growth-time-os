const styles = `
  :host { position: fixed; right: 16px; bottom: 16px; z-index: 80; display: block; }
  * { box-sizing: border-box; }
  .notice { width: min(390px, calc(100vw - 32px)); padding: 16px; color: var(--ink); background: var(--white); border: 1px solid var(--line); border-radius: 16px; box-shadow: var(--shadow); }
  .eyebrow { margin: 0 0 7px; color: var(--green); font: 700 10px/1.2 var(--font-mono); letter-spacing: .12em; }
  h2 { margin: 0 0 6px; font-size: 16px; }
  p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.55; }
  .actions { margin-top: 13px; display: flex; justify-content: flex-end; gap: 8px; }
  button { padding: 9px 12px; border: 0; border-radius: 9px; font: 700 12px/1 var(--font-sans); cursor: pointer; }
  .primary { color: var(--white); background: var(--ink); }
  .secondary { color: var(--muted); background: var(--paper-deep); }
  @media (max-width: 520px) { :host { right: 10px; bottom: 10px; } .notice { width: calc(100vw - 20px); } }
`

class PwaController extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.mode = 'hidden'
    this.registration = null
    this.installPrompt = null
    this.reloading = false
    this.updateAccepted = false
    this.dismissedUpdate = false
    this.onBeforeInstallPrompt = (event) => {
      event.preventDefault()
      if (this.isStandalone()) return
      this.installPrompt = event
      this.mode = 'install'
      this.render()
    }
    this.onAppInstalled = () => {
      this.installPrompt = null
      this.mode = 'hidden'
      this.render()
    }
    this.onControllerChange = () => {
      if (!this.updateAccepted || this.reloading) return
      this.reloading = true
      location.reload()
    }
    this.onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.registration) {
        this.registration.update().catch(() => {})
      }
    }
  }

  connectedCallback() {
    window.addEventListener('beforeinstallprompt', this.onBeforeInstallPrompt)
    window.addEventListener('appinstalled', this.onAppInstalled)
    navigator.serviceWorker?.addEventListener('controllerchange', this.onControllerChange)
    document.addEventListener('visibilitychange', this.onVisibilityChange)
    this.render()
    this.registerServiceWorker()
  }

  disconnectedCallback() {
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', this.onAppInstalled)
    navigator.serviceWorker?.removeEventListener('controllerchange', this.onControllerChange)
    document.removeEventListener('visibilitychange', this.onVisibilityChange)
  }

  isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  }

  async registerServiceWorker() {
    if (!('serviceWorker' in navigator) || !window.isSecureContext) return
    try {
      this.registration = await navigator.serviceWorker.register('./service-worker.js', {
        scope: './',
        updateViaCache: 'none',
      })
      this.observeRegistration(this.registration)
      await this.registration.update()
    } catch {
      this.registration = null
    }
  }

  observeRegistration(registration) {
    if (registration.waiting && navigator.serviceWorker.controller) this.showUpdate()
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) this.showUpdate()
      })
    })
  }

  showUpdate() {
    if (this.dismissedUpdate) return
    this.mode = 'update'
    this.render()
  }

  async install() {
    if (!this.installPrompt) return
    try {
      await this.installPrompt.prompt()
      await this.installPrompt.userChoice
    } catch {
      // Installation support is optional; the core app remains available.
    } finally {
      this.installPrompt = null
      this.mode = 'hidden'
      this.render()
    }
  }

  applyUpdate() {
    const waiting = this.registration?.waiting
    if (!waiting) return
    this.updateAccepted = true
    this.mode = 'applying'
    this.render()
    waiting.postMessage({ type: 'SKIP_WAITING' })
  }

  dismiss() {
    if (this.mode === 'update') this.dismissedUpdate = true
    this.mode = 'hidden'
    this.render()
  }

  render() {
    if (this.mode === 'hidden') {
      this.shadowRoot.innerHTML = `<style>${styles}</style>`
      return
    }
    const content = {
      install: {
        eyebrow: 'MOBILE APP',
        title: '홈 화면에 설치할 수 있어요.',
        body: 'NOW Todo를 별도 앱 창에서 바로 여세요.',
        action: '앱 설치',
      },
      update: {
        eyebrow: 'UPDATE READY',
        title: '새 version이 준비됐어요.',
        body: '현재 입력을 마친 뒤 적용해도 됩니다.',
        action: '업데이트',
      },
      applying: {
        eyebrow: 'UPDATING',
        title: '새 version을 적용하고 있어요.',
        body: '잠시 후 한 번 새로 열립니다.',
        action: '',
      },
    }[this.mode]
    this.shadowRoot.innerHTML = `<style>${styles}</style>
      <section class="notice" role="status" aria-live="polite">
        <p class="eyebrow">${content.eyebrow}</p>
        <h2>${content.title}</h2>
        <p>${content.body}</p>
        ${
          this.mode === 'applying'
            ? ''
            : `<div class="actions"><button class="secondary" type="button" data-dismiss>나중에</button><button class="primary" type="button" data-action>${content.action}</button></div>`
        }
      </section>`
    this.shadowRoot.querySelector('[data-dismiss]')?.addEventListener('click', () => this.dismiss())
    this.shadowRoot.querySelector('[data-action]')?.addEventListener('click', () => {
      if (this.mode === 'install') this.install()
      else this.applyUpdate()
    })
  }
}

customElements.define('pwa-controller', PwaController)
