import { curryN } from "ramda";

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

export const combineReducers = reducerMapObj => (state, action) =>
  Object.keys(reducerMapObj).reduce((nextState, key) => {
    nextState[key] = reducerMapObj[key](state[key], action);
    return nextState;
  }, {});
