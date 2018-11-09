import { curryN, __, pipe } from "ramda";

const BOUND_REDUCER_SYMBOL = Symbol("bound reducer symbol");

export interface AnyPayload {
  [props: string]: any;
}

export interface Action<T = any, P = AnyPayload> {
  type: T;
  payload?: P;
}

export interface Reducer<State, A extends Action> {
  (state: State, action: A): State;
}

export interface BoundReducerAction<State, Type = any, Payload = AnyPayload>
  extends Action<Type, Payload> {
  [BOUND_REDUCER_SYMBOL]: true;
  reducer: Reducer<State, Action<Type, Payload>>;
}

export const isBoundReducerAction = <
  A extends Action & { [BOUND_REDUCER_SYMBOL]?: true }
>(
  action: A
) => Boolean(action[BOUND_REDUCER_SYMBOL]);

export const createBoundReducerActionCreator = curryN(
  5,
  <State, A extends Action>(
    reducer: Reducer<State, A>,
    prefix: string,
    actionType: string,
    argNames = [],
    argsToPayload = (...args: string[]) => ({ args })
  ) => {
    const createAction = (...args: any[]) => ({
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
