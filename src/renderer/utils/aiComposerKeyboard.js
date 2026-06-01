export function resolveAiComposerKeyAction(event, state = {}) {
  if (event?.key === 'Escape') return state.isGenerating ? 'stop' : ''
  if (event?.key !== 'Enter' || event?.isComposing || event?.keyCode === 229) return ''

  const hasModifier = Boolean(event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
  return !hasModifier && state.canSend ? 'send' : ''
}
