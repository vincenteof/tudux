import { combineReducers, Action } from '../src/index'

describe('combine small reducers to a big one', () => {
  const reducer1 = (state = 'INIT_ONE', action: Action) => {
    switch (action.type) {
      case 'ONE_ONE':
        return {
          value: 'ONE'
        }
      case 'ONE_TWO':
        return {
          value: 'TWO'
        }
      case 'TWO_ONE':
        return {
          other: 'ahh'
        }
      default:
        return state
    }
  }
  const reducer2 = (state = 'INIT_TWO', action: Action) => {
    switch (action.type) {
      case 'TWO_ONE':
        return {
          value: 'ONE'
        }
      case 'TWO_TWO':
        return {
          value: 'TWO'
        }
      case 'ONE_ONE':
        return {
          other: 'opp'
        }
      default:
        return state
    }
  }
  const reducer = combineReducers({
    first: reducer1,
    second: reducer2
  })

  it('has the default state for unknown action', () => {
    const nextState = reducer({}, { type: 'UNKNOWN' })
    expect(nextState).toMatchObject({
      first: 'INIT_ONE',
      second: 'INIT_TWO'
    })
  })

  it('transfers state correctly', () => {
    const nextState1 = reducer({}, { type: 'UNKNOWN' })
    const nextState2 = reducer(nextState1, { type: 'ONE_ONE' })
    expect(nextState2).toMatchObject({
      first: {
        value: 'ONE'
      },
      second: {
        other: 'opp'
      }
    })
    const nextState3 = reducer(nextState2, { type: 'TWO_ONE' })
    expect(nextState3).toMatchObject({
      first: {
        other: 'ahh'
      },
      second: {
        value: 'ONE'
      }
    })
    const nextState4 = reducer(nextState3, { type: 'ONE_TWO' })
    expect(nextState4).toMatchObject({
      first: {
        value: 'TWO'
      },
      second: {
        value: 'ONE'
      }
    })
    const nextState5 = reducer(nextState4, { type: 'UNKNOWN' })
    expect(nextState5).toMatchObject({
      first: {
        value: 'TWO'
      },
      second: {
        value: 'ONE'
      }
    })
  })

  it('throws error when reducer returns undefined', () => {
    const badReducer = (state = 'INIT', action: Action) => {
      switch (action.type) {
        case 'ONE':
          return {
            value: 'ONE'
          }
        case 'OPP':
          return undefined
        default:
          return state
      }
    }
    const withBad = combineReducers({
      good: reducer1,
      bad: badReducer
    })
    const nextState1 = withBad({}, { type: 'UNKNOWN' })
    expect(() => {
      withBad(nextState1, { type: 'OPP' })
    }).toThrow()
  })
})
