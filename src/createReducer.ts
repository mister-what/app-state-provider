import { curryN } from "ramda";
import {Action, Reducer, AnyAction} from "./context";

export const createPrefixedReducer = curryN(3, (prefix = "", initState, reducerObj) => {
  if (typeof prefix !== "string") {
    throw new TypeError("prefix must be a string");
  }
  const prefixedReducers = Object.entries(reducerObj).reduce(
    (reducers, [type, reducer]) => {
      reducers[`${prefix}${prefix.length ? "/" : ""}${type}`] = reducer;
      return reducers;
    },
    {}
  );
  return curryN(
    2,
    (state = initState, action) =>
      action &&
      typeof action.type === "string" &&
      typeof prefixedReducers[action.type] === "function"
        ? prefixedReducers[action.type](state, action)
        : state
  );
});

export const createReducer = createPrefixedReducer("");

export type ReducersMapObject<S = any, A extends Action = Action> = {
  [K in keyof S]: Reducer<S[K], A>
}


export const combineReducers = <S = any, A extends Action = AnyAction>(reducerMapObj: ReducersMapObject<S, A>): Reducer<S, A> => (state, action) =>
  Object.keys(reducerMapObj).reduce((nextState: S, key: string) => {
    nextState[key] = reducerMapObj[key](state[key], action);
    return nextState;
  }, {} as S);
