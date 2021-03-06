import {
  createStore,
  bindActionCreators,
  Dispatchedable,
  isPlainAction,
  StoreState
} from '../src/index'

describe('transform action creators to wrapped dispatch method', () => {
  const addTodo = (text: string) => {
    return {
      type: 'ADD_TODO',
      text
    }
  }
  const removeTodo = (id: number) => {
    return {
      type: 'REMOVE_TODO',
      id
    }
  }
  const reducer = (
    state: StoreState = { todos: [] },
    action: Dispatchedable
  ) => {
    const reshapedState = state as { todos: string[] }
    if (isPlainAction(action)) {
      switch (action.type) {
        case 'ADD_TODO':
          return { todos: [...reshapedState.todos, action.text] }
        case 'REMOVE_TODO':
          const { todos } = reshapedState
          todos.splice(action.id, 1)
          return { todos: [...todos] }
        default:
          return state
      }
    }
    return state
  }
  it('creates wrapped dispath method and call it directly', () => {
    const store = createStore(reducer)
    const dispatch = store.dispatch.bind(store)
    const dispatchObject = bindActionCreators(
      {
        addTodo,
        removeTodo
      },
      dispatch
    )
    dispatchObject.addTodo('ahhh')
    expect(store.getState()).toMatchObject({ todos: ['ahhh'] })
    dispatchObject.removeTodo(0)
    expect(store.getState()).toMatchObject({ todos: [] })
  })
})
