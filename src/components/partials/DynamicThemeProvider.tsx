import React from 'react';
import { ThemeProvider } from 'styled-components';
import { useSelector } from 'react-redux';

import { ReducerStoreState } from '../../reducers';
import defaultTheme from "../../params/defaultTheme";


const DynamicThemeProvider = ({ children }: any) => {
	const theme = useSelector<ReducerStoreState>(state =>
		defaultTheme(state?.navbar?.darkTheme)
	) as any;

	return (
		<ThemeProvider theme={theme}>
			{children}
		</ThemeProvider>
	);
};

export default DynamicThemeProvider;
