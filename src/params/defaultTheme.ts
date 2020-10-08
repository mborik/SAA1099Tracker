import { Colors } from '@blueprintjs/core';

const defaultTheme = (darkTheme?: boolean) => ({
	color: {
		blue: darkTheme ? Colors.BLUE1 : Colors.BLUE5,
		green: darkTheme ? Colors.GREEN1 : Colors.GREEN5,
		border: darkTheme ? Colors.DARK_GRAY2 : Colors.LIGHT_GRAY3,
		grayPanel: darkTheme ? Colors.DARK_GRAY3 : Colors.LIGHT_GRAY5,
		gray: Colors.GRAY3
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
});

export default defaultTheme;
