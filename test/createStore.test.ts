import {
  createStore,
  isPlainAction,
  Dispatchedable,
  StoreState
} from '../src/index'

describe('store creation and basic usage', () => {
  const reducer = (state: StoreState = 'INIT', action: Dispatchedable) => {
    if (isPlainAction(action)) {
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
    return state
  }

  it('creates a store with default state', () => {
    const store = createStore(reducer)
    expect(store.getState()).toBe('INIT')
  })

  it('creates a store with preloaded state', () => {
    const store = createStore(reducer, { preloadedState: 'First' })
    expect(store.getState()).toBe('First')
  })

  it('dispatches some actions', () => {
    const store = createStore(reducer, { preloadedState: '' })
    store.dispatch({ type: 'FIRST' })
    expect(store.getState()).toBe('First')
    store.dispatch({ type: 'SECOND' })
    expect(store.getState()).toMatchObject({ value: 'Second' })
  })

  it('creates a store and makes observation', () => {
    const MyConsole = {
      log: jest.fn()
    }
    const store = createStore(reducer)
    const observable = store.observable()
    const { unsubscribe } = observable.subscribe({
      next: state => MyConsole.log(state)
    })
    store.dispatch({ type: 'FIRST' })
    expect(MyConsole.log).toHaveBeenLastCalledWith('First')
    unsubscribe()
    store.dispatch({ type: 'SECONED' })
    expect(MyConsole.log).toHaveBeenCalled()
  })

  it('creates a store and unsubscribes', () => {
    const MyConsole = {
      log: jest.fn()
    }
    const store = createStore(reducer)
    const observable = store.observable()
    const { unsubscribe } = observable.subscribe({
      next: state => MyConsole.log(state)
    })
    unsubscribe()
    store.dispatch({ type: 'FIRST' })
    expect(MyConsole.log).not.toHaveBeenCalled()
  })
})
