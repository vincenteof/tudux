import { createStore, Action } from '../src/index'

describe('store creation and basic usage', () => {
  it('creates a store with simple state', () => {
    const reducer = (state: any = '', action: Action) => {
      switch (action.type) {
        case 'INIT':
          return 'inited'
        default:
          return state
      }
    }
    const store = createStore(reducer, '')
    expect(store.getState()).toBe('')
  })
})
