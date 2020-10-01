import { Colors } from '@blueprintjs/core';

export default {
	blueprint: {
		...Colors
	},
	tracker: {
		maxWidth: '1118px'
	},
	flexboxgrid: {
		gridSize: 16,
		gutterWidth: 1,
		outerMargin: 0,
		mediaQuery: 'only screen',
		container: {
			sm: 46, // rem
			md: 61, // rem
			lg: 76  // rem
		},
		breakpoints: {
			xs: 0,  // em
			sm: 48, // em
			md: 64, // em
			lg: 75  // em
		}
	}
}