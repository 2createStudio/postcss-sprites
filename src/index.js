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
const plugin = (options = {}) => {
	return {
		postcssPlugin: 'postcss-sprites',
		Once: (css, { result }) => {
			// Extend defaults
			const opts = _.merge({}, defaults, options);

			// Setup the logger
			opts.logger = createLogger(opts.verbose);

			// Prepare filter & group functions
			prepareFilterBy(opts, result);
			prepareGroupBy(opts);

			// Process it
			return extractImages(css, opts, result)
				.then(([opts, images]) => applyFilterBy(opts, images))
				.then(([opts, images]) => applyGroupBy(opts, images))
				.then(([opts, images]) => setTokens(css, opts, images))
				.then(([root, opts, images]) => runSpritesmith(opts, images))
				.then(([opts, images, spritesheets]) => saveSpritesheets(opts, images, spritesheets))
				.then(([opts, images, spritesheets]) => mapSpritesheetProps(opts, images, spritesheets))
				.then(([opts, images, spritesheets]) => updateReferences(css, opts, images, spritesheets))
				.then(([root, opts, images, spritesheets]) => {
					opts.logger(`${spritesheets.length} ${spritesheets.length > 1 ? 'spritesheets' : 'spritesheet'} generated.`);
				})
				.catch((err) => {
					console.error(`postcss-sprites: An error occurred while processing files - ${err.message}`);
					console.error(err.stack);
					throw err;
				});
		}
	}
};
plugin.postcss = true;

export default plugin;
