export function isDev(): boolean {
	return (
		!process.env.NODE_ENV ||
		process.env.NODE_ENV === 'development' ||
		/[?&#]dev/.test(window.location.search || window.location.hash)
	);
};
