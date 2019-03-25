import { createStore, Action } from '../src/index'

describe('store creation and basic usage', () => {
  const reducer = (state: any = 'INIT', action: Action) => {
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

  it('creates a store with default state', () => {
    const store = createStore(reducer)
    expect(store.getState()).toBe('INIT')
  })

  it('creates a store with preloaded state', () => {
    const store = createStore(reducer, 'First')
    expect(store.getState()).toBe('First')
  })

  it('dispatches some actions', () => {
    const store = createStore(reducer, '')
    store.dispatch({ type: 'FIRST' })
    expect(store.getState()).toBe('First')
    store.dispatch({ type: 'SECOND' })
    expect(store.getState()).toMatchObject({ value: 'Second' })
  })
})