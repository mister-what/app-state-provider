import { curryN, __, pipe } from "ramda";

const BOUND_REDUCER_SYMBOL = Symbol("bound reducer symbol");

export const isBoundReducerAction = action =>
  Boolean((action || {})[BOUND_REDUCER_SYMBOL]);

export const createActionCreator = curryN(
  5,
  (
    reducer = (state = {}, { payload } = {}) => ({ ...state, ...payload }),
    prefix,
    actionType,
    argNames = [],
    argsToPayload = (...args) => ({ args })
  ) => {
    const createAction = (...args) => ({
      type: `${prefix}/${actionType}`,
      [BOUND_REDUCER_SYMBOL]: true,
      payload: argsToPayload(...args),
      reducer
    });
    return curryN(
      argNames.length,
      (() => {})
        .constructor(
          "createAction",
          ...argNames,
          `return createAction.apply(null, [${argNames.join(", ")}])`
        )
        .bind(null, createAction)
    );
  }
);

export const actionReducer = (reducer = state => state) => (state, action) => {
  let pipeline = [curryN(2, reducer)(__, action)];
  if (isBoundReducerAction(action)) {
    pipeline = [curryN(2, action.reducer)(__, action), ...pipeline];
  }
  return pipe(...pipeline)(state);
};
