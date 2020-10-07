import { Colors } from '@blueprintjs/core';

export default {
	blueprint: {
		...Colors
	},
	tracker: {
		maxWidth: '70rem'
	},
	flexboxgrid: {
		gridSize: 16,
		gutterWidth: .4,
		outerMargin: 0,
		mediaQuery: 'only screen',
		container: {
			sm: 42, // rem
			md: 56, // rem
			lg: 70  // rem
		},
		breakpoints: {
			xs: 0,  // em
			sm: 48, // em
			md: 64, // em
			lg: 80  // em
		}
	}
}