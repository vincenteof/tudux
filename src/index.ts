interface Action {
  type: string
  [propName: string]: any
}

// todo: does this definition make the invariant that a reducer may never transform state to undefined???
type NotUndefined = string | number | boolean | symbol | object
type Reducer = (state: any, action: Action) => NotUndefined

type StoreListener = () => void
type StoreUnsubscriber = () => void

interface IStore {
  getState(): any
  dispatch(action: Action): Action
  subscrible(listener: StoreListener): StoreUnsubscriber
}

class Store implements IStore {
  private state: any
  private reducer: Reducer
  private listeners: StoreListener[]
  private dispatching: boolean

  constructor(reducer: Reducer, preloadState: any) {
    this.reducer = reducer
    this.state = preloadState
    this.listeners = []
    this.dispatching = false
  }

  getState() {
    if (this.dispatching) {
      throw new Error(
        'You should not call store.getState() in reducer, ' +
          'use the provided state parameter instead.'
      )
    }
    return this.state
  }

  dispatch(action: Action): Action {
    if (this.dispatching) {
      throw new Error('Reducers may not dispatch actions.')
    }

    this.dispatching = true
    try {
      const nextState = this.reducer(this.state, action)
      // so we cannot modify inner state by modifying the result of `getState`
      if (nextState instanceof Object) {
        Object.freeze(nextState)
      }
      this.state = nextState
    } finally {
      this.dispatching = false
    }

    this.listeners.forEach(listener => listener())
    return action
  }

  subscrible(listener: StoreListener): StoreUnsubscriber {
    if (this.dispatching) {
      throw new Error('You should not call store.subscrible() in reducer')
    }

    // this flag is used to solve the problem that same listener subscribles twice
    // while the previous used unsubscriber still works
    let isSubscribled = true
    this.listeners.push(listener)

    return () => {
      if (!isSubscribled) {
        return
      }
      const pos = this.listeners.indexOf(listener)
      if (pos >= 0) {
        this.listeners.splice(pos, 1)
        isSubscribled = false
      }
    }
  }
}

function createStore(reducer: Reducer, preloadedState: any): IStore {
  return new Store(reducer, preloadedState)
}

type ReducerObject = {
  [propName: string]: Reducer
}

// todo: does returning a new state which is inner equal to previous state harmful???
function combineReducers(reducers: ReducerObject): Reducer {
  const keys = Object.keys(reducers)

  return (state, action) => {
    const nextState = {} as { [propName: string]: any }
    for (const key of keys) {
      const reducer = reducers[key]
      const tinyState = reducer(state, action)
      nextState[key] = tinyState
    }
    return nextState
  }
}

type ActionCreator = (...args: any[]) => Action
type ActionCreatorObject = {
  [propName: string]: ActionCreator
}
type WrappedDispatch = (...args: any[]) => Action
type WrappedDispatchObject = {
  [propName: string]: WrappedDispatch
}
type DispatchFunc = (action: Action) => Action

function bindActionCreators(
  actionCreators: ActionCreator | ActionCreatorObject,
  dispatch: DispatchFunc
): WrappedDispatch | WrappedDispatchObject {
  if (isActionCreator(actionCreators)) {
    return transform(actionCreators, dispatch)
  }

  const result = {} as WrappedDispatchObject
  const keys = Object.keys(actionCreators)
  for (const key of keys) {
    const actionCreator = actionCreators[key]
    const wrappedDispatch = transform(actionCreator, dispatch)
    result[key] = wrappedDispatch
  }
  return result
}

function transform(
  actionCreator: ActionCreator,
  dispatch: DispatchFunc
): WrappedDispatch {
  return (...args: any[]) => {
    const action = actionCreator(args)
    return dispatch(action)
  }
}

// todo: more elegent type guard for union type and type alias???
function isActionCreator(
  actionCreators: ActionCreator | ActionCreatorObject
): actionCreators is ActionCreator {
  return !(actionCreators instanceof Object)
}

export { createStore, IStore, Action, combineReducers, bindActionCreators }
