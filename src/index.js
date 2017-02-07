import postcss from 'postcss';
import _ from 'lodash';
import {
	defaults,
	prepareFilterBy,
	prepareGroupBy,
	extractImages,
	applyFilterBy,
	applyGroupBy,
	setTokens,
	runSpritesmith,
	saveSpritesheets,
	mapSpritesheetProps,
	updateReferences,
	createLogger
} from './core';

/**
 * Plugin registration.
 */
export default postcss.plugin('postcss-sprites', (options = {}) => {
	return (css, result) => {
		// Extend defaults
		const opts = _.merge({}, defaults, options);

		// Setup the logger
		opts.logger = createLogger(opts.verbose);

		// Prepare filter & group functions
		prepareFilterBy(opts, result);
		prepareGroupBy(opts);

		// Process it
		return extractImages(css, opts, result)
			.spread((opts, images) => applyFilterBy(opts, images))
			.spread((opts, images) => applyGroupBy(opts, images))
			.spread((opts, images) => setTokens(css, opts, images))
			.spread((root, opts, images) => runSpritesmith(opts, images))
			.spread((opts, images, spritesheets) => saveSpritesheets(opts, images, spritesheets))
			.spread((opts, images, spritesheets) => mapSpritesheetProps(opts, images, spritesheets))
			.spread((opts, images, spritesheets) => updateReferences(css, opts, images, spritesheets))
			.spread((root, opts, images, spritesheets) => {
				opts.logger(`${spritesheets.length} ${spritesheets.length > 1 ? 'spritesheets' : 'spritesheet'} generated.`);
			})
			.catch((err) => {
				console.error(`postcss-sprites: An error occurred while processing files - ${err.message}`);
				console.error(err.stack);
				throw err;
			});
	}
});
