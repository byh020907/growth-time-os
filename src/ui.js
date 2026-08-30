export const escapeHtml = (value = '') =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

export const projectName = (state, projectId) =>
  state.projects.find((project) => project.id === projectId)?.name ?? '알 수 없는 프로젝트'

export const formatDate = (value) => {
  if (!value) return ''
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(new Date(value))
}

export const readCardDraft = (form, prefix = '') => {
  const value = (name) => form.elements.namedItem(`${prefix}${name}`)?.value ?? ''
  return {
    title: value('title'),
    executionContext: value('executionContext'),
    resumeLocation: value('resumeLocation'),
    previousResult: value('previousResult'),
    firstAction: value('firstAction'),
    completionCriteria: value('completionCriteria'),
    verificationMethod: value('verificationMethod'),
    detourAction: value('detourAction'),
    expectedMinutes: Number(value('expectedMinutes')),
  }
}

export const cardFieldsHtml = (card, prefix = '') => `
  <div class="form-grid">
    <label class="field field-wide">
      <span>카드 제목 *</span>
      <input name="${prefix}title" required value="${escapeHtml(card.title)}" placeholder="동사 + 구체적 대상" />
    </label>
    <label class="field">
      <span>실행 시점 / 장소</span>
      <input name="${prefix}executionContext" value="${escapeHtml(card.executionContext)}" placeholder="평일 저녁 식사 후 / 내 책상" />
    </label>
    <label class="field">
      <span>예상 세션 (분)</span>
      <input name="${prefix}expectedMinutes" type="number" min="1" required value="${escapeHtml(card.expectedMinutes)}" />
    </label>
    <label class="field field-wide">
      <span>이어받을 파일 / 문서 / 페이지 *</span>
      <input name="${prefix}resumeLocation" required value="${escapeHtml(card.resumeLocation)}" placeholder="resume_v2.docx / 경력 2 / 세 번째 항목" />
    </label>
    <label class="field field-wide">
      <span>직전 결과 한 줄 *</span>
      <input name="${prefix}previousResult" required value="${escapeHtml(card.previousResult)}" placeholder="첫 카드라면 현재 상태, 이후 카드는 이어받을 결과" />
    </label>
    <label class="field field-wide">
      <span>첫 행동 — 2분 안에 시작 가능하게 *</span>
      <textarea name="${prefix}firstAction" required placeholder="파일을 열고 첫 번째 오류 메시지를 확인한다">${escapeHtml(card.firstAction)}</textarea>
    </label>
    <label class="field field-wide">
      <span>완료 조건 *</span>
      <textarea name="${prefix}completionCriteria" required placeholder="한 세션 안에 예/아니오로 판정할 수 있는 결과">${escapeHtml(card.completionCriteria)}</textarea>
    </label>
    <label class="field field-wide">
      <span>검증 방법 *</span>
      <textarea name="${prefix}verificationMethod" required placeholder="테스트 실행, 기준표 비교, 정답률 기록 등">${escapeHtml(card.verificationMethod)}</textarea>
    </label>
    <label class="field field-wide">
      <span>10분 막힐 때 우회 행동 *</span>
      <textarea name="${prefix}detourAction" required placeholder="진행 불가능할 때도 남길 수 있는 가장 작은 증거">${escapeHtml(card.detourAction)}</textarea>
    </label>
  </div>
`

export const emptyDraft = (project) => ({
  title: '',
  executionContext: project?.defaultContext ?? '',
  resumeLocation: '',
  previousResult: '',
  firstAction: '',
  completionCriteria: '',
  verificationMethod: '',
  detourAction: '',
  expectedMinutes: project?.defaultSessionMinutes ?? 50,
})

export const dispatchAction = (element, type, payload = {}) =>
  element.dispatchEvent(
    new CustomEvent('domain-action', {
      bubbles: true,
      composed: true,
      detail: { type, payload },
    }),
  )
