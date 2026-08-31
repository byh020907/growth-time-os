const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const styles = `
  :host { display: block; }
  * { box-sizing: border-box; }
  button, input, textarea, select { font: inherit; }
  .flow { min-height: 390px; padding: clamp(24px, 5vw, 48px); display: grid; grid-template-rows: auto 1fr auto; gap: 30px; background: var(--white); border: 1px solid var(--line); border-radius: 20px; box-shadow: var(--shadow); }
  .flow-head { display: grid; gap: 12px; }
  .meta { display: flex; justify-content: space-between; gap: 16px; color: var(--muted); font: 700 11px/1.3 var(--font-mono); letter-spacing: .08em; }
  .progress { height: 5px; overflow: hidden; background: var(--paper-deep); border-radius: 999px; }
  .progress span { display: block; width: var(--progress); height: 100%; background: var(--green); border-radius: inherit; transition: width 180ms ease; }
  .question { align-self: center; max-width: 760px; }
  .eyebrow { margin: 0 0 10px; color: var(--green); font: 700 11px/1.3 var(--font-mono); letter-spacing: .13em; }
  h2 { margin: 0 0 9px; font: 600 clamp(25px, 4vw, 38px)/1.25 var(--font-serif); letter-spacing: -.025em; }
  .help { min-height: 24px; margin: 0 0 24px; color: var(--muted); line-height: 1.6; }
  label { display: grid; gap: 8px; }
  label span { color: var(--muted); font-size: 12px; font-weight: 750; }
  input, textarea, select { width: 100%; padding: 15px 16px; color: var(--ink); background: var(--paper); border: 1px solid var(--line); border-radius: 12px; font-size: 17px; }
  textarea { min-height: 112px; resize: vertical; line-height: 1.55; }
  input:focus, textarea:focus, select:focus { outline: 3px solid color-mix(in srgb, var(--green) 34%, transparent); border-color: var(--green); }
  .error { min-height: 20px; margin: 8px 0 0; color: var(--red); font-size: 12px; font-weight: 700; }
  .flow-actions { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .actions-right { display: flex; align-items: center; gap: 9px; }
  .button, .text-button { border: 0; cursor: pointer; }
  .button { padding: 12px 18px; border-radius: 11px; font-weight: 750; }
  .button-primary { color: var(--white); background: var(--ink); }
  .text-button { padding: 9px; color: var(--muted); background: transparent; }
  .text-button:disabled { opacity: 0; pointer-events: none; }
  .key-hint { color: var(--muted); font-size: 11px; }
  @media (max-width: 620px) {
    .flow { min-height: 430px; padding: 22px; }
    .flow-actions { align-items: stretch; flex-direction: column-reverse; }
    .actions-right { justify-content: space-between; }
    .key-hint { display: none; }
  }
`

class GuidedEntryForm extends HTMLElement {
  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    this.stepIndex = 0
    this.values = {}
  }

  set config(value) {
    this._config = value
    this.stepIndex = 0
    this.values = { ...(value.initialValues ?? {}) }
    this.error = ''
    this.render()
  }

  connectedCallback() {
    this.render()
  }

  setValue(name, value) {
    this.values[name] = value
  }

  render() {
    if (!this._config?.steps?.length) return
    const { steps, eyebrow = 'GUIDED INPUT', submitLabel = '완료' } = this._config
    const step = steps[this.stepIndex]
    const isLast = this.stepIndex === steps.length - 1
    const progress = Math.round(((this.stepIndex + 1) / steps.length) * 100)

    this.shadowRoot.innerHTML = `<style>${styles}</style>
      <form class="flow" novalidate style="--progress: ${progress}%">
        <div class="flow-head">
          <div class="meta"><span>${escapeHtml(eyebrow)}</span><span>${this.stepIndex + 1} / ${steps.length}</span></div>
          <div class="progress" aria-label="입력 진행률 ${progress}%"><span></span></div>
        </div>
        <section class="question" aria-live="polite">
          <p class="eyebrow">${escapeHtml(step.label)}</p>
          <h2>${escapeHtml(step.question)}</h2>
          <p class="help">${escapeHtml(step.help ?? '')}</p>
          ${this.controlHtml(step)}
          <p class="error" role="alert">${escapeHtml(this.error ?? '')}</p>
        </section>
        <div class="flow-actions">
          <button class="text-button" type="button" data-back ${this.stepIndex === 0 ? 'disabled' : ''}>← 이전</button>
          <div class="actions-right">
            <span class="key-hint">${step.type === 'textarea' ? 'Ctrl/⌘ + Enter' : 'Enter'}로 다음</span>
            ${!step.required ? '<button class="text-button" type="button" data-skip>건너뛰기</button>' : ''}
            <button class="button button-primary" type="submit">${isLast ? escapeHtml(submitLabel) : '다음 →'}</button>
          </div>
        </div>
      </form>`

    const form = this.shadowRoot.querySelector('form')
    const control = form.elements.entry
    form.addEventListener('submit', (event) => {
      event.preventDefault()
      this.advance(control.value)
    })
    control.addEventListener('input', () => {
      this.values[step.name] = control.value
      if (this.error) {
        this.error = ''
        this.shadowRoot.querySelector('.error').textContent = ''
      }
    })
    if (step.type === 'textarea') {
      control.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault()
          form.requestSubmit()
        }
      })
    }
    this.shadowRoot.querySelector('[data-back]')?.addEventListener('click', () => {
      this.values[step.name] = control.value
      this.stepIndex -= 1
      this.error = ''
      this.render()
    })
    this.shadowRoot.querySelector('[data-skip]')?.addEventListener('click', () => this.advance(''))
    requestAnimationFrame(() => control.focus())
  }

  controlHtml(step) {
    const value = this.values[step.name] ?? step.defaultValue ?? ''
    const common = `name="entry" id="guided-entry" ${step.required ? 'required' : ''}`
    if (step.type === 'textarea') {
      return `<label><span>${escapeHtml(step.label)}${step.required ? ' *' : ''}</span><textarea ${common} placeholder="${escapeHtml(step.placeholder ?? '')}">${escapeHtml(value)}</textarea></label>`
    }
    if (step.type === 'select') {
      return `<label><span>${escapeHtml(step.label)}${step.required ? ' *' : ''}</span><select ${common}>${step.options
        .map(
          (option) =>
            `<option value="${escapeHtml(option.value)}" ${String(option.value) === String(value) ? 'selected' : ''}>${escapeHtml(option.label)}</option>`,
        )
        .join('')}</select></label>`
    }
    return `<label><span>${escapeHtml(step.label)}${step.required ? ' *' : ''}</span><input ${common} type="${escapeHtml(step.type ?? 'text')}" value="${escapeHtml(value)}" placeholder="${escapeHtml(step.placeholder ?? '')}" ${step.min !== undefined ? `min="${escapeHtml(step.min)}"` : ''} /></label>`
  }

  advance(rawValue) {
    const { steps } = this._config
    const step = steps[this.stepIndex]
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue
    if (step.required && !String(value).trim()) {
      this.error = '이 답이 있어야 다음 질문으로 넘어갈 수 있어요.'
      this.shadowRoot.querySelector('.error').textContent = this.error
      this.shadowRoot.querySelector('[name="entry"]').focus()
      return
    }
    if (step.type === 'number' && value !== '' && Number(value) < Number(step.min ?? 0)) {
      this.error = `${step.min ?? 0} 이상의 숫자를 입력해 주세요.`
      this.shadowRoot.querySelector('.error').textContent = this.error
      return
    }
    this.values[step.name] = value
    this.dispatchEvent(
      new CustomEvent('guided-step', {
        bubbles: true,
        composed: true,
        detail: { name: step.name, value },
      }),
    )
    if (this.stepIndex === steps.length - 1) {
      this.dispatchEvent(
        new CustomEvent('guided-complete', {
          bubbles: true,
          composed: true,
          detail: { ...this.values },
        }),
      )
      return
    }
    this.stepIndex += 1
    this.error = ''
    this.render()
  }
}

customElements.define('guided-entry-form', GuidedEntryForm)
