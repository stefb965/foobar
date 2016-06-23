/* global window, document */
"use strict";

const { bindActionCreators, combineReducers } = require("redux");
const { Provider } = require("react-redux");
const ReactDOM = require("react-dom");
const React = require("react");

const {
  getTargetFromQuery, setConfigs, isDevToolsPanel
} = require("./configs/feature");

setConfigs();

const configureStore = require("./util/create-store");
const reducers = require("./reducers");
const actions = require("./actions");
const { getClient, connectClients, startDebugging } = require("./clients");
const firefox = require("./clients/firefox");

const Tabs = require("./components/Tabs");
const App = require("./components/App");

const store = configureStore({
  log: false,
  makeThunkArgs: (args, state) => {
    return Object.assign({}, args, { client: getClient(state) });
  }
})(combineReducers(reducers));

const boundActions = bindActionCreators(actions, store.dispatch);

// global for debugging purposes only!
window.store = store;
window.injectDebuggee = require("./test/utils/debuggee");

function renderRoot(appStore, component) {
  ReactDOM.render(
    React.createElement(
      Provider,
      { store: appStore },
      React.createFactory(component)()
    ),
    document.querySelector("#mount")
  );
}

const connTarget = getTargetFromQuery();
if (connTarget) {
  startDebugging(connTarget, boundActions).then(() => renderRoot(store, App));
} else if (isDevToolsPanel()) {
  // The toolbox already provides the tab to debug.
  module.exports = {
    setThreadClient: firefox.setThreadClient,
    setTabTarget: firefox.setTabTarget,
    initPage: firefox.initPage,
    getBoundActions: () => boundActions,
    renderApp: () => renderRoot(store, App)
  };
} else {
  connectClients().then(tabs => {
    boundActions.newTabs(tabs);
    renderRoot(store, Tabs);
  });
}
