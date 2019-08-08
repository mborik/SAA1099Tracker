/* config-overrides.js */
const { addBabelPlugin, override } = require('customize-cra')

module.exports = override(
	addBabelPlugin([ "const-enum", {
		"transform": "constObject"
	}])
);
