import React from "react";
import ReactDOM from "react-dom";
import {
  evolve,
  __,
  pipe,
  pathSatisfies,
  ifElse,
  identity,
  assocPath,
  path
} from "ramda";
import { AppStateProvider, connectAppState } from "./context";
import { createPrefixedReducer, combineReducers } from "./createReducer";
import {
  createActionCreator,
  isBoundReducerAction,
  actionReducer
} from "./createReducerAction";

import "./styles.css";

const createReducer = createPrefixedReducer("names");
const nameReducer = createReducer(
  {},
  {
    SET_NAME: (state = {}, { payload: { id, name } = {} } = {}) => ({
      ...state,
      [id]: { ...state[id], id, name }
    })
  }
);

const idReducer = createReducer([], {
  SET_IDS: (state = [], { payload: { ids = [] } = {} } = {}) => ids
});

const nameActionCreator = createActionCreator(
  (state, action, defaultState = {}) =>
    pipe(
      ifElse(
        pathSatisfies(nameState => Boolean(nameState), ["names"]),
        identity,
        assocPath(["names"], defaultState)
      ),
      evolve({ names: nameReducer(__, action) })
    )(state),
  "names",
  "SET_NAME",
  ["id", "name"],
  (id, name) => ({ id, name })
);

const reducer = combineReducers({
  names: nameReducer,
  ids: idReducer
});

const MyNameChanger = ({ name, setNameReducer, newName = () => "", p = 1 }) => (
  <button onClick={() => setNameReducer(newName(name, p))}>Hi {name}</button>
);
MyNameChanger.displayName = "MyNameChanger";

const Heading = ({ name, id, p }) => (
  <div>
    <h1>
      Name of {id} is {name}.
    </h1>
    <h2>Probability of change = {p}</h2>
  </div>
);

const Json = ({ state }) => (
  <code style={{ display: "flex", justifyContent: "center" }}>
    <pre style={{ textAlign: "left" }}>{JSON.stringify(state, null, 2)}</pre>
  </code>
);

const BoundJson = connectAppState(state => ({ state }))(Json);

const mapStateToProps = (state, { id = "a1" }) => {
  //const name = path(["names", id, "name"], state);
  //console.log(name);
  return { ...path(["names", id], state) };
};
const MyBoundNameChanger = connectAppState(mapStateToProps, (dispatch, { id }) => ({
  setName: name => {
    dispatch({ type: "SET_NAME", payload: { name, id } });
  },
  setNameReducer: pipe(
    nameActionCreator(id),
    action => {
      // console.log(action);
      return action;
    },
    dispatch
  )
}))(MyNameChanger);

const BoundHeading = connectAppState(mapStateToProps)(Heading);

class App extends React.Component {
  state = {
    names: {
      oscar: { id: "oscar", name: "Oscar", p: 0.99 },
      jonas: { id: "jonas", name: "Jonas", p: 0.5 }
    }
  };
  handleStateChange = ({ state }) => {
    //this.setState(state);
  };
  reducer = actionReducer();
  render() {
    return (
      <AppStateProvider
        state={this.state}
        reducer={this.reducer}
        onStateChange={this.handleStateChange}
      >
        <div className="App">
          <BoundHeading id="oscar" />
          <BoundHeading id="jonas" />
          <MyBoundNameChanger
            id="oscar"
            newName={(name, p) =>
              name === "Oscar" && Math.round(Math.random() * 1000) < Math.round(p * 1000)
                ? "Jonas"
                : "Oscar"
            }
          />
          <MyBoundNameChanger
            id="jonas"
            newName={(name, p) =>
              name === "Jonas" && Math.round(Math.random() * 1000) < Math.round(p * 1000)
                ? "Oscar"
                : "Jonas"
            }
          />
          <BoundJson />
        </div>
      </AppStateProvider>
    );
  }
}

const rootElement = document.getElementById("root");
ReactDOM.render(<App />, rootElement);
