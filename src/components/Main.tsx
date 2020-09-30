import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { actionTrackerInit } from '../actions/tracker';


const Main: React.FunctionComponent = () => {
	const dispatch = useDispatch();

	useEffect(() => {
		dispatch(actionTrackerInit());
	}, [ dispatch ]);


	return (
		<main className="bp3-fill" role="main">
		</main>
	);
}

export default Main;
