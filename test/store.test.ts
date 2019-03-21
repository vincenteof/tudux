import { createStore, Action } from '../src/index'

describe('store creation and basic usage', () => {
  const reducer = (state: any = '', action: Action) => {
    switch (action.type) {
      case 'FIRST':
        return 'First'
      case 'SECOND':
        return {
          value: 'Second'
        }
      default:
        return state
    }
  }

  it('creates a store with simple state', () => {
    const store = createStore(reducer, '')
    expect(store.getState()).toBe('')
  })

  it('dispatches some actions', () => {
    const store = createStore(reducer, '')
    store.dispatch({ type: 'FIRST' })
    expect(store.getState()).toBe('First')
    store.dispatch({ type: 'SECOND' })
    expect(store.getState().value).toBe('Second')
  })
})
