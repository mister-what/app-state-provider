import React from "react";
import PropTypes from "prop-types";
import { shallowEqual } from "recompose";

const memSelect = (selectors = [], memoizedSelector = () => {}) => {
  let lastSelectorValues = new Array(selectors.length).fill(undefined);
  let memoizedValue = undefined;
  return (...state) => {
    const nextSelectorValues = selectors.map(selector => selector(...state));
    if (nextSelectorValues.some((value, index) => value !== lastSelectorValues[index])) {
      lastSelectorValues = nextSelectorValues;
      memoizedValue = memoizedSelector(...nextSelectorValues);
    }
    return memoizedValue;
  };
};

const memoizeWith = (memoizer = (...args) => args.toString()) => (
  memoizedFn = () => {}
) => {
  const memMap = new Map();
  return (...args) => {
    const key = memoizer(...args);
    if (!memMap.has(key)) {
      const value = memoizedFn(...args);
      memMap.set(key, value);
    }
    return memMap.get(key);
  };
};

const AppState = React.createContext({ state: {} });

// console.log(AppState.Provider.displayName);
// console.log(AppState.Consumer);

class AppStateProvider extends React.Component {
  static propTypes = {
    reducer: PropTypes.func,
    onStateChange: PropTypes.func,
    state: PropTypes.oneOfType([PropTypes.object, PropTypes.array])
  };

  static defaultProps = {
    reducer: (state = {}) => state,
    onStateChange: () => {},
    state: {}
  };

  static getDerivedStateFromProps(props, lastState) {
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
      ({ state: { current } = {} } = {}) => current,
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

const connectAppState = (
  mapStateToProps = (state, ownProps) => ({}),
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

export { AppStateProvider, connectAppState };
