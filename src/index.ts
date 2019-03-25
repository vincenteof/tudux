interface Action {
  type: string
  [propName: string]: any
}
type FuncAction = (
  dispatch: DispatchFunc,
  getState: () => any,
  ...extra: any[]
) => void
type Dispatchedable = Action | FuncAction

function isPlainAction(action: Dispatchedable): action is Action {
  return (action as Action).type !== undefined
}

// todo: is this a type-level way of making the invariant that reducer never returns undefined???
type Reducer = (state: any, action: Dispatchedable) => Exclude<any, undefined>

type StoreListener = () => void
type StoreUnsubscriber = () => void

interface IStore {
  getState(): any
  dispatch(action: Dispatchedable): Dispatchedable
  subscrible(listener: StoreListener): StoreUnsubscriber
}

const INIT_ACTION_TYPE = '__$$tudux/INIT__'

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
    // initialize the whole state, if preloadState provided, it will be the initial state
    // otherwise the state will be default value of reducer
    this.dispatch({ type: INIT_ACTION_TYPE })
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

  dispatch(action: Dispatchedable): Dispatchedable {
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

function createStore(
  reducer: Reducer,
  preloadedState?: any,
  enhancer?: StoreEnhancer
): IStore {
  // todo: deal with this ugly shit
  if (typeof preloadedState === 'function' && typeof enhancer === 'undefined') {
    return preloadedState(createStore)(reducer)
  }
  if (enhancer) {
    return enhancer(createStore)(reducer, preloadedState)
  }
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
      const tinyState = reducer(state[key], action)
      // todo: how to deal it more elegantly in a type-level way???
      if (typeof tinyState === 'undefined') {
        throw new Error('Reducer should never return undefined.')
      }
      nextState[key] = tinyState
    }
    return nextState
  }
}

type ActionCreator = (...args: any[]) => Dispatchedable
type ActionCreatorObject = {
  [propName: string]: ActionCreator
}
type WrappedDispatch = (...args: any[]) => Dispatchedable
type WrappedDispatchObject = {
  [propName: string]: WrappedDispatch
}
type DispatchFunc = (action: Dispatchedable) => Dispatchedable

// overloading list
function bindActionCreators(
  actionCreators: ActionCreator,
  dispatch: DispatchFunc
): WrappedDispatch
function bindActionCreators(
  actionCreators: ActionCreatorObject,
  dispatch: DispatchFunc
): WrappedDispatchObject

// todo: type-level way of making the compiler to infer what keys the result object should have
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
    const action = actionCreator(...args)
    return dispatch(action)
  }
}

// todo: more elegent type guard for union type and type alias???
function isActionCreator(
  actionCreators: ActionCreator | ActionCreatorObject
): actionCreators is ActionCreator {
  return !(actionCreators instanceof Object)
}

interface SubStore {
  getState(): any
  dispatch(action: Dispatchedable): Dispatchedable
}
type Middleware = (subStore: SubStore) => (next: DispatchFunc) => DispatchFunc
type StoreEnhancer = (_createStore: typeof createStore) => typeof createStore

function applyMiddleware(...middlewares: Middleware[]): StoreEnhancer {
  return createStore => {
    return (reducer: Reducer, preloadedState?: any) => {
      const store = createStore(reducer, preloadedState)
      // avoid this method being called in the following `middlewars.map(...)`
      let enhancedDispatch: DispatchFunc = (_: Dispatchedable) => {
        throw new Error('You cannot dispatch when constructing middlewares.')
      }
      const subStore = {
        getState: store.getState.bind(store),
        dispatch: enhancedDispatch
      }
      const chain = middlewares.map(middleware => middleware(subStore))
      enhancedDispatch = compose(...chain)(store.dispatch.bind(store))
      return {
        ...store,
        dispatch: enhancedDispatch
      }
    }
  }
}

function compose(
  ...funcs: ((next: DispatchFunc) => DispatchFunc)[]
): (next: DispatchFunc) => DispatchFunc {
  if (funcs.length === 0) {
    return next => next
  }
  if (funcs.length === 1) {
    return funcs[0]
  }
  return funcs.reduce((a, b) => (next: DispatchFunc) => a(b(next)))
}

export {
  IStore,
  Action,
  Dispatchedable,
  isPlainAction,
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  Middleware
}
