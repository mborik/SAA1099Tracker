export const isDev = (
	/[?&#]dev/.test(window.location.search || window.location.hash) ||
	!process.env.NODE_ENV ||
	process.env.NODE_ENV === 'development'
);

/**
 * Log message onto console when development mode is active.
 * First param
 * @param {string} section
 * @param {...any[]} args
 */
export function devLog(section: string, ...args: any[]): void {
	if (!isDev) {
		return;
	}

	if (section && args.length > 0 && typeof args[0] === 'string') {
		args.splice(0, 1, `%c[${section}]%c ${args[0]}`, 'color:steelblue', 'color:inherit');
	} else {
		args.unshift(section);
	}

	console.log.apply(console, args);
}
