export const RENDERER_EVENTS = Object.freeze({
  OPEN_FILE: 'open-file',
  SAVE_TABS: 'save-tabs',
  OPEN_GLOBAL_SEARCH: 'open-global-search',
  JUMP_TO_LOCATION: 'editor-jump-to-location',
  UNDO: 'editor-undo',
  REDO: 'editor-redo',
  FIND: 'editor-find',
  REPLACE: 'editor-replace',
  SELECT_ALL: 'editor-select-all'
})

export function emitRendererEvent(eventName, detail) {
  window.dispatchEvent(new CustomEvent(eventName, detail === undefined ? undefined : { detail }))
}

export function onRendererEvent(eventName, handler, options) {
  window.addEventListener(eventName, handler, options)
  return () => {
    window.removeEventListener(eventName, handler, options)
  }
}