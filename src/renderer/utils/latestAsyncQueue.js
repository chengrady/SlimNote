export function createSequentialLatestRunner() {
  let tail = Promise.resolve()
  let latestId = 0

  return {
    run(task) {
      latestId += 1
      const runId = latestId
      const execute = () => task({ isLatest: () => runId === latestId })
      const result = tail.then(execute, execute)
      tail = result.catch(() => {})
      return result
    },

    runLatest(task, staleValue) {
      latestId += 1
      const runId = latestId
      const isLatest = () => runId === latestId
      const getStaleValue = () => (typeof staleValue === 'function' ? staleValue() : staleValue)
      const execute = () => (isLatest() ? task({ isLatest }) : getStaleValue())
      const result = tail.then(execute, execute)
      tail = result.catch(() => {})
      return result
    }
  }
}
