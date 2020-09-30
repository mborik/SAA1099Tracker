import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import logger from 'redux-logger';

import App from './components/App';
import reducers from './reducers';
import { isDev } from './utils/dev';
import * as serviceWorker from './serviceWorker';

import './index.scss';


const store = createStore(
	reducers,
	isDev ?
		applyMiddleware(thunkMiddleware, logger) :
		applyMiddleware(thunkMiddleware)
);

ReactDOM.render(
	<Provider store={store}>
		<App />
	</Provider>,
	document.getElementById('root')
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
