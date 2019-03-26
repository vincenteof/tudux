import {
  applyMiddleware,
  Action,
  Middleware,
  Dispatchedable,
  isPlainAction,
  createStore
} from '../src/index'

describe('add logging ability of a store', () => {
  const MyConsole = {
    log: jest.fn()
  }
  const logger: Middleware = () => {
    return next => action => {
      const returnValue = next(action)
      MyConsole.log(`action has be dispatched: ${(action as Action).type}`)
      return returnValue
    }
  }
  // todo: why here it reports warning if the type of action is `Action`
  const reducer = (state: any = 'INIT', action: Dispatchedable) => {
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
  it('dispatches with logs', () => {
    const store = createStore(reducer, { enhancer: applyMiddleware(logger) })
    store.dispatch({ type: 'FIRST' })
    expect(MyConsole.log).toHaveBeenLastCalledWith(
      'action has be dispatched: FIRST'
    )
    store.dispatch({ type: 'SECOND' })
    expect(MyConsole.log).toHaveBeenLastCalledWith(
      'action has be dispatched: SECOND'
    )
  })
})
