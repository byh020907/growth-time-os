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
