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

// a type-level way of making the invariant that reducer never returns undefined
// (and i also exclude null)
type StoreState = { [propName: string]: any } | string | boolean | number
type Reducer = (
  state: StoreState | undefined,
  action: Dispatchedable
) => StoreState

type StoreListener = () => void
type StoreUnsubscribe = () => void
type StoreObservable = {
  subscribe(observer: {
    next?: (state: StoreState) => void
  }): { unsubscribe: StoreUnsubscribe }
  [Symbol.observable](): StoreObservable
}

interface IStore {
  getState(): any
  dispatch(action: Dispatchedable): Dispatchedable
  subscribe(listener: StoreListener): StoreUnsubscribe
  observable(): StoreObservable
}

const INIT_ACTION_TYPE = '__$$tudux/INIT__'

class Store implements IStore {
  private state: any
  private reducer: Reducer
  private listeners: StoreListener[]
  private dispatching: boolean

  constructor(reducer: Reducer, preloadedState: any) {
    this.reducer = reducer
    this.state = preloadedState
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

  subscribe(listener: StoreListener): StoreUnsubscribe {
    if (this.dispatching) {
      throw new Error('You should not call store.subscribe() in reducer')
    }

    // this flag is used to solve the problem that same listener subscribes twice
    // while the previous used unsubscriber still works
    let issubscribed = true
    this.listeners.push(listener)

    return () => {
      if (!issubscribed) {
        return
      }
      const pos = this.listeners.indexOf(listener)
      if (pos >= 0) {
        this.listeners.splice(pos, 1)
        issubscribed = false
      }
    }
  }

  observable() {
    const outer = this
    return {
      subscribe(observer: { next?: (state: StoreState) => void }) {
        const observeState = () => {
          if (observer.next) {
            observer.next(outer.getState())
          }
        }

        const unsubscribe = outer.subscribe(observeState)
        return { unsubscribe }
      },
      [Symbol.observable]() {
        return this
      }
    }
  }
}

// function optional arguments works very weiredly with `any`,
// so i create a object to hold all optional arguments
interface CreateStoreOption {
  preloadedState?: any
  enhancer?: StoreEnhancer
}

function createStore(reducer: Reducer, options?: CreateStoreOption): IStore {
  if (!options) {
    return new Store(reducer, undefined)
  }

  if (options.enhancer) {
    const storedEnhancer = options.enhancer
    const preloadedStateOption = { preloadedState: options.preloadedState }
    return storedEnhancer(createStore)(reducer, preloadedStateOption)
  }

  return new Store(reducer, options.preloadedState)
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
      // you should make the preloadedState the same shape as reducers object if using preloadedState,
      // otherwise an runtime undefined error may happen
      const shapedState = state as { [propName: string]: any }
      const tinyState = reducer(shapedState[key], action)
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
type WrappedDispatchObject<T> = { [propName in keyof T]: WrappedDispatch }
type DispatchFunc = (action: Dispatchedable) => Dispatchedable

// overloading list
function bindActionCreators(
  actionCreators: ActionCreator,
  dispatch: DispatchFunc
): WrappedDispatch
// type-level way of making the compiler to infer what keys the result object should have
function bindActionCreators<T extends ActionCreatorObject>(
  actionCreators: T,
  dispatch: DispatchFunc
): WrappedDispatchObject<T>

function bindActionCreators<T extends ActionCreatorObject>(
  actionCreators: ActionCreator | T,
  dispatch: DispatchFunc
): WrappedDispatch | WrappedDispatchObject<T> {
  if (isActionCreator(actionCreators)) {
    return transform(actionCreators, dispatch)
  }

  const result = {} as WrappedDispatchObject<typeof actionCreators>
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

function isActionCreator(
  actionCreators: ActionCreator | ActionCreatorObject
): actionCreators is ActionCreator {
  return actionCreators instanceof Function
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
  StoreState,
  Dispatchedable,
  isPlainAction,
  createStore,
  combineReducers,
  bindActionCreators,
  applyMiddleware,
  Middleware,
  Reducer
}
