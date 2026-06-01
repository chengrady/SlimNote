import { ref } from 'vue'

function buildInputKey(providerId, keyId) {
  const normalizedProviderId = String(providerId || '').trim()
  const normalizedKeyId = String(keyId || '').trim()
  return normalizedProviderId && normalizedKeyId ? `${normalizedProviderId}:${normalizedKeyId}` : ''
}

export function createAiApiKeyInputState(getProviderId) {
  const inputs = ref({})
  const focusedInputKey = ref('')

  function getInputKey(keyId, providerId = getProviderId?.()) {
    return buildInputKey(providerId, keyId)
  }

  function getValue(keyId) {
    const inputKey = getInputKey(keyId)
    return inputKey ? inputs.value[inputKey] || '' : ''
  }

  function setValue(keyId, value) {
    const inputKey = getInputKey(keyId)
    if (!inputKey) return
    inputs.value = {
      ...inputs.value,
      [inputKey]: String(value ?? '')
    }
  }

  function focus(keyId) {
    focusedInputKey.value = getInputKey(keyId)
  }

  function blur(keyId) {
    const inputKey = getInputKey(keyId)
    if (!inputKey || focusedInputKey.value === inputKey) focusedInputKey.value = ''
  }

  function hasInput(providerId, keyId) {
    const inputKey = buildInputKey(providerId, keyId)
    return Boolean(inputKey && Object.prototype.hasOwnProperty.call(inputs.value, inputKey))
  }

  function getProviderValue(providerId, keyId) {
    const inputKey = buildInputKey(providerId, keyId)
    return inputKey ? inputs.value[inputKey] || '' : ''
  }

  function clear(keys = Object.keys(inputs.value), options = {}) {
    const keepFocused = options.keepFocused !== false
    const nextInputs = { ...inputs.value }
    keys.forEach((inputKey) => {
      if (keepFocused && inputKey === focusedInputKey.value) return
      delete nextInputs[inputKey]
    })
    inputs.value = nextInputs
  }

  function clearAll() {
    inputs.value = {}
    focusedInputKey.value = ''
  }

  return {
    inputs,
    getInputKey,
    getValue,
    setValue,
    focus,
    blur,
    hasInput,
    getProviderValue,
    clear,
    clearAll
  }
}
