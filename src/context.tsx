import * as React from "react";
import * as PropTypes from "prop-types";
import { shallowEqual } from "recompose";
import { Provider } from "react";
import { any } from "prop-types";

interface Selector {
  (...state: any[]): any
}

export interface Action<T = any> {
  type: T
}

export interface AnyAction extends Action {
  [extraProps: string]: any
}

export type Reducer<S = any, A extends Action = AnyAction> = (
  state: S | undefined,
  action: A
) => S

const memSelect = (selectors: Array<Selector> = [], memoizedSelector: Selector): Selector => {
  let lastSelectorValues = new Array(selectors.length).fill(undefined);
  let memoizedValue: any = undefined;
  return (...state: any[]) => {
    const nextSelectorValues = selectors.map(selector => selector(...state));
    if (nextSelectorValues.some((value, index) => value !== lastSelectorValues[index])) {
      lastSelectorValues = nextSelectorValues;
      memoizedValue = memoizedSelector(...nextSelectorValues);
    }
    return memoizedValue;
  };
};



export function createAppState<State = any>(defaultState: State) {
  const AppState = React.createContext<{ state: State }>({ state: defaultState });

  type ProviderProps = {
    reducer: Reducer<State>,
    onStateChange?: (state: State) => void,
    state?: State,
    children: React.ReactNode
  };

  class AppStateProvider extends React.Component<ProviderProps> {
    static propTypes = {
      reducer: PropTypes.func.isRequired,
      onStateChange: PropTypes.func,
      state: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
      children: PropTypes.node
    };

    static defaultProps = {
      onStateChange: () => {},
      state: defaultState
    };

    static getDerivedStateFromProps(props: ProviderProps, lastState) {
      let nextState = lastState;
      if (props.state && !shallowEqual(props.state, lastState.state.last)) {
        nextState = {
          ...lastState,
          state: {
            current: props.state,
            last: props.state
          }
        };
      }
      return nextState;
    }

    isDispatching = false;

    state = {
      state: {
        current: this.props.state,
        last: this.props.state
      },
      dispatch: action => {
        const { onStateChange } = this.props;
        this.setState(
          ({ state: { current, last } }) => {
            if (this.isDispatching) {
              throw new Error("Dispatching actions while dispatching is not allowed");
            }
            this.isDispatching = true;
            const { reducer } = this.props;
            const nextState = reducer(current, action);
            this.isDispatching = false;
            return { state: { current: nextState, last } };
          },
          () => onStateChange(this.contextValueSelector(this.state))
        );
      }
    };

    contextValueSelector = memSelect(
      [
        ({ state: { current } = {current: undefined} } = {}) => current,
        ({ dispatch = () => {} } = {}) => dispatch
      ],
      (state, dispatch) => ({ state, dispatch })
    );

    render() {
      return (
        <AppState.Provider value={this.contextValueSelector(this.state)}>
          {this.props.children}
        </AppState.Provider>
      );
    }
  }

  const createContextConsumer = (Component, areEqual) => {
    class ContextConsumer extends React.Component {
      static displayName = `ContextConsumer:${Component.displayName}`;

      shouldComponentUpdate(nextProps) {
        return !areEqual(this.props, nextProps);
      }

      render() {
        return <Component {...this.props} />;
      }
    }

    return ContextConsumer;
  };

  interface ConnectAppState<OwnProps = any, ComponentType extends React.ComponentType = any> {
    (mapStateToProps: (state: State, ownProps: OwnProps) => any): (Component: ComponentType) => ComponentType
  }

  const connectAppState = (
    mapStateToProps: (state: State, ownProps: ) => ({}),
    mapDispatchToProps = () => ({}),
    isEqual = (lastMappedProps, nextMappedProps) =>
      shallowEqual(lastMappedProps, nextMappedProps)
  ) => Component =>
    class extends React.Component {
      static displayName = `connectedAppState(${Component.displayName})`;
      static propTypes = Component.propTypes;
      static defaultProps = Component.defaultProps;

      ContextConsumer = createContextConsumer(Component, (lastProps, nextProps) => {
        const props = Object.keys(this.props).reduce(
          (props, propName) => {
            props.own.next[propName] = nextProps[propName];
            props.own.last[propName] = lastProps[propName];
            delete props.mapped.last[propName];
            delete props.mapped.next[propName];
            return props;
          },
          {
            own: { last: {}, next: {} },
            mapped: { last: { ...lastProps }, next: { ...nextProps } }
          }
        );
        return (
          shallowEqual(props.own.last, props.own.next) &&
          isEqual(props.mapped.last, props.mapped.next)
        );
      });

      render() {
        const { props: ownProps, ContextConsumer } = this;
        return (
          <AppState.Consumer>
            {({ state, dispatch }) => {
              return (
                <ContextConsumer
                  {...ownProps}
                  {...mapDispatchToProps(dispatch, ownProps)}
                  {...mapStateToProps(state, ownProps)}
                />
              );
            }}
          </AppState.Consumer>
        );
      }
    };
  return { AppStateProvider, connectAppState };
};
