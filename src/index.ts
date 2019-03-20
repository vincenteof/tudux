interface Action {
  type: string
  [propName: string]: any
}

type Reducer = (state: any, action: Action) => any

type StoreListener = (getState: () => any) => void
type StoreUnsubscriber = () => void

interface IStore {
  getState(): any
  dispatch(action: Action): void
  subscrible(listener: StoreListener): StoreUnsubscriber
}

class Store implements IStore {
  private state: any
  private reducer: Reducer
  private listeners: StoreListener[]

  constructor(reducer: Reducer, preloadState: any) {
    this.reducer = reducer
    this.state = preloadState
    this.listeners = []
  }

  getState() {
    // todo: modification to the result should not interfere with inner state
    return this.state
  }

  dispatch(action: Action): void {
    // todo: deal with multi-dispatching???
    const nextState = this.reducer(this.state, action)
    this.state = nextState
    const giveNewState = () => nextState
    this.listeners.forEach(listener => listener(giveNewState))
  }

  subscrible(listener: StoreListener): StoreUnsubscriber {
    this.listeners.push(listener)
    return () => {
      const pos = this.listeners.indexOf(listener)
      if (pos >= 0) {
        this.listeners.splice(pos, 1)
      }
    }
  }
}

function createStore(reducer: Reducer, preloadedState: any): IStore {
  return new Store(reducer, preloadedState)
}

export { createStore, IStore, Action }
