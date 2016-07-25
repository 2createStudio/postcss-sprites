import path from 'path';
import fs from 'fs-extra';
import postcss from 'postcss';
import Promise from 'bluebird';
import _ from 'lodash';
import Spritesmith from 'spritesmith';

/**
 * Wrap with promises.
 */
Promise.promisifyAll(fs);

/**
 * Plugin constants.
 */
const RELATIVE_TO_FILE = 'file';
const RELATIVE_TO_RULE = 'rule';
const BACKGROUND = 'background';
const BACKGROUND_IMAGE = 'background-image';
const ONE_SPACE = ' ';
const COMMENT_TOKEN_PREFIX = '@replace|';
const GROUP_DELIMITER = '.';
const GROUP_MASK = '*';

/**
 * Plugin defaults.
 */
export const defaults = {
	basePath: './',
	stylesheetPath: './',
	spritePath: './',
	relativeTo: 'file',
	filterBy: [],
	groupBy: [],
	retina: false,
	hooks: {
		onSaveSpritesheet: null,
		onUpdateRule: null
	},
	spritesmith: {
		engine: 'pixelsmith',
		algorithm: 'binary-tree',
		padding: 0,
		engineOpts: {},
		exportOpts: {}
	}
};

/**
 * Plugin registration.
 */
export default postcss.plugin('postcss-sprites', (opts = {}) => {
	return (css, result) => {
		// Extend defaults
		opts = _.merge({}, defaults, opts);

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
				result.warn(`${spritesheets.length} ${spritesheets.length > 1 ? 'spritesheets' : 'spritesheet'} generated.`);
			})
			.catch((err) => {
				console.error(`postcss-sprites: An error occurred while processing files - ${err.message}`);
				console.error(err.stack);
				throw err;
			});
	}
});

/**
 * Prepares the filter functions.
 * @param  {Object} opts
 * @param  {Result} result
 * @return
 */
export function prepareFilterBy(opts, result) {
	if (_.isFunction(opts.filterBy)) {
		opts.filterBy = [opts.filterBy];
	}

	// Filter non existing images
	opts.filterBy.unshift(image => {
		return fs.statAsync(image.path)
			.catch(() => {
				result.warn(`skip ${image.url} because doesn't exist.`);
				throw new Error(`Skip ${image.url} because doesn't exist.`);
			});
	});
}

/**
 * Prepares the group functions.
 * @param  {Object} opts
 * @return
 */
export function prepareGroupBy(opts) {
	if (_.isFunction(opts.groupBy)) {
		opts.groupBy = [opts.groupBy];
	}

	// Group by retina ratio
	if (opts.retina) {
		opts.groupBy.unshift((image) => {
			if (image.retina) {
				return Promise.resolve(`@${image.ratio}x`);
			}

			return Promise.reject();
		});
	}
}

/**
 * Walks the given CSS string and extracts all images
 * that can be converted to sprite.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Result} result
 * @return {Promise}
 */
export function extractImages(root, opts, result) {
	let images = [];

	// Search for background & background image declartions
	root.walkRules((rule) => {
		const styleFilePath = opts.relativeTo === RELATIVE_TO_RULE ? rule.source.input.file : root.source.input.file;
		const ABSOLUTE_URL = /^\//;

		// The host object of found image
		const image = {
			path: null,
			url: null,
			retina: false,
			ratio: 1,
			groups: [],
			token: '',
			styleFilePath: styleFilePath
		};

		// Manipulate only rules with image in them
		if (hasImageInRule(rule.toString())) {
			image.url = getImageUrl(rule.toString());

			if (isImageSupported(image.url)) {
				// Search for retina images
				if (opts.retina && isRetinaImage(image.url)) {
					image.retina = true;
					image.ratio = getRetinaRatio(image.url);
				}

				// Get the filesystem path to the image
				if (ABSOLUTE_URL.test(image.url)) {
					image.path = path.resolve(opts.basePath + image.url);
				} else {
					image.path = path.resolve(path.dirname(styleFilePath), image.url);
				}

				images.push(image);
			} else {
				result.warn(`skip ${image.url} because isn't supported.`);
			}
		}
	});

	// Remove duplicates and empty values
	images = _.uniqBy(images, 'path');

	return Promise.resolve([opts, images]);
}

/**
 * Apply filterBy functions over collection of exported images.
 * @param  {Object}  opts
 * @param  {Array}   images
 * @return {Promise}
 */
export function applyFilterBy(opts, images) {
	return Promise.reduce(opts.filterBy, (images, filterFn) => {
		return Promise.filter(images, (image) => {
			return filterFn(image)
				.then(() => true)
				.catch(() => false);
		}, { concurrency: 1 });
	}, images).then(images => [opts, images]);
}

/**
 * Apply groupBy functions over collection of exported images.
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
export function applyGroupBy(opts, images) {
	return Promise.reduce(opts.groupBy, (images, groupFn) => {
		return Promise.map(images, (image) => {
			return groupFn(image)
				.then(group => {
					image.groups.push(group);
					return image;
				})
				.catch(() => image);
		});
	}, images).then(images => [opts, images]);
}

/**
 * Replaces the background declarations that needs to be updated
 * with a sprite image.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
export function setTokens(root, opts, images) {
	return new Promise((resolve, reject) => {
		root.walkDecls(/^background(-image)?$/, (decl) => {
			const rule = decl.parent;
			const ruleStr = rule.toString();
			let url, image, color, backgroundColorDecl, commentDecl;

			// Manipulate only rules with image in them
			if (hasImageInRule(ruleStr)) {
				url = getImageUrl(ruleStr);
				image = _.find(images, { url });

				if (image) {
					// Remove all necessary background declarations
					rule.walkDecls(/^background-(repeat|size|position)$/, decl => decl.remove());

					// Extract color to background-color property
					if (decl.prop === BACKGROUND) {
						color = getColor(decl.value);

						if (color) {
							backgroundColorDecl = postcss.decl({
								prop: 'background-color',
								value: getColor(decl.value)
							});
							backgroundColorDecl.raws.before = ONE_SPACE;

							rule.append(backgroundColorDecl);
						}
					}

					// Replace with comment token
					if (decl.prop === BACKGROUND || decl.prop === BACKGROUND_IMAGE) {
						commentDecl = postcss.comment({
							text: image.url
						});

						commentDecl.raws.left = `${ONE_SPACE}${COMMENT_TOKEN_PREFIX}`;
						image.token = commentDecl.toString();

						decl.replaceWith(commentDecl);
					}
				}
			}
		});

		resolve([root, opts, images]);
	});
}

/**
 * Process the images through spritesmith module.
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
export function runSpritesmith(opts, images) {
	return new Promise((resolve, reject) => {
		const spritesmithRunAsync = Promise.promisify(Spritesmith.run, { context: Spritesmith });
		const promises = _.chain(images)
			.groupBy((image) => {
				let tmp = image.groups.map(maskGroup(true));
				tmp.unshift('_');

				return tmp.join(GROUP_DELIMITER);
			})
			.map((images, tmp) => {
				const config = _.merge({}, opts.spritesmith, {
					src: _.map(images, 'path')
				});
				let ratio;

				// Increase padding to handle retina ratio
				if (areRetinaImages(images)) {
					ratio = _.chain(images)
						.flatten('ratio')
						.uniq()
						.head()
						.value().ratio;

					if (ratio) {
						config.padding = config.padding * ratio;
					}
				}

				return spritesmithRunAsync(config)
					.then((spritesheet) => {
						tmp = tmp.split(GROUP_DELIMITER);
						tmp.shift();

						spritesheet.groups = tmp.map(maskGroup());

						return spritesheet;
					});
			})
			.value();

		Promise.all(promises)
			.then((spritesheets) => {
				resolve([opts, images, spritesheets])
			})
			.catch((err) => {
				reject(err);
			});
	});
}

/**
 * Saves the spritesheets to the disk.
 * @param  {Object} opts
 * @param  {Array}  images
 * @param  {Array}  spritesheets
 * @return {Promise}
 */
export function saveSpritesheets(opts, images, spritesheets) {
	return Promise.each(spritesheets, (spritesheet) => {
		spritesheet.path = _.isFunction(opts.hooks.onSaveSpritesheet)
			? opts.hooks.onSaveSpritesheet(opts, spritesheet.groups)
			: makeSpritesheetPath(opts, spritesheet.groups);

		if (!spritesheet.path) {
			throw new Error('postcss-sprites: Spritesheet requires a relative path.');
		}

		spritesheet.path = spritesheet.path.replace(/\\/g, '/');

		return fs.outputFileAsync(spritesheet.path, spritesheet.image);
	}).then(spritesheets => {
		return [opts, images, spritesheets];
	});
}

/**
 * Map spritesheet props to every image.
 * @param  {Object} opts
 * @param  {Array}  images
 * @param  {Array}  spritesheets
 * @return {Promise}
 */
export function mapSpritesheetProps(opts, images, spritesheets) {
	_.forEach(spritesheets, ({ coordinates, path, properties }) => {
		const spritePath = path;
		const spriteWidth = properties.width;
		const spriteHeight = properties.height;

		_.forEach(coordinates, (coords, imagePath) => {
			_.chain(images)
				.find(['path', imagePath])
				.merge({
					coords,
					spritePath,
					spriteWidth,
					spriteHeight
				})
				.value();
		});
	});

	return Promise.resolve([opts, images, spritesheets]);
}

/**
 * Updates the CSS references.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Array}  images
 * @param  {Array}  spritesheets
 * @return {Promise}
 */
export function updateReferences(root, opts, images, spritesheets) {
	root.walkComments((comment) => {
		let rule, image;

		// Manipulate only comment tokens
		if (isToken(comment.toString())) {
			rule = comment.parent;
			image = _.find(images, { url: comment.text });

			// Update the rule with background declarations
			if (image) {
				// Generate CSS url to sprite
				image.spriteUrl = path.relative(opts.stylesheetPath, image.spritePath);
				image.spriteUrl = image.spriteUrl.split(path.sep).join('/');

				// Update rule
				if (_.isFunction(opts.hooks.onUpdateRule)) {
					opts.hooks.onUpdateRule(rule, comment, image);
				} else {
					updateRule(rule, comment, image);
				}

				// Cleanup token
				comment.remove();
			}
		}
	});

	return Promise.resolve([root, opts, images, spritesheets]);
}

/**
 * Update an single CSS rule.
 * @param  {Node}   rule
 * @param  {Node}   token
 * @param  {Object} image
 * @return
 */
export function updateRule(rule, token, image) {
	const { retina, ratio, coords, spriteUrl, spriteWidth, spriteHeight } = image;
	const posX = coords.x / ratio;
	const posY = coords.y / ratio;
	const sizeX = spriteWidth / ratio;
	const sizeY = spriteHeight / ratio;

	const backgroundImageDecl = postcss.decl({
		prop: 'background-image',
		value: `url(${spriteUrl})`
	});

	const backgroundPositionDecl = postcss.decl({
		prop: 'background-position',
		value: `${-1 * posX}px ${-1 * posY}px`
	});

	rule.insertAfter(token, backgroundImageDecl);
	rule.insertAfter(backgroundImageDecl, backgroundPositionDecl);

	if (retina) {
		const backgroundSizeDecl = postcss.decl({
			prop: 'background-size',
			value: `${sizeX}px ${sizeY}px`
		});

		rule.insertAfter(backgroundPositionDecl, backgroundSizeDecl);
	}
}

/////////////////////////
// ----- Helpers ----- //
/////////////////////////

/**
 * Checks for image url in the given CSS rules.
 * @param  {String}  rule
 * @return {Boolean}
 */
export function hasImageInRule(rule) {
	return /background[^:]*.*url[^;]+/gi.test(rule);
}

/**
 * Extracts the url of image from the given rule.
 * @param  {String} rule
 * @return {String}
 */
export function getImageUrl(rule) {
	const matches = /background[^:]*:.*url\(([\S]+)\)/gi.exec(rule);

	if (!matches) {
		return '';
	}

	return matches[1]
		.replace(/['"]/gi, '') // replace all quotes
		.replace(/\?.*$/gi, ''); // replace query params
}

/**
 * Checks whether the image is supported.
 * @param  {String}  url
 * @return {Boolean}
 */
export function isImageSupported(url) {
	const http = /^http[s]?/gi;
	const base64 = /^data\:image/gi;

	return !http.test(url) && !base64.test(url);
}

/**
 * Checks whether the image is retina.
 * @param  {String}  url
 * @return {Boolean}
 */
export function isRetinaImage(url) {
	return /@(\d)x\.[a-z]{3,4}$/gi.test(url);
}

/**
 * Extracts the retina ratio of image.
 * @param  {String} url
 * @return {Number}
 */
export function getRetinaRatio(url) {
	const matches = /@(\d)x\.[a-z]{3,4}$/gi.exec(url);

	if (!matches) {
		return 1;
	}

	return parseInt(matches[1], 10);
}

/**
 * Extracts the color from background declaration.
 * @param  {String}  declValue
 * @return {String?}
 */
export function getColor(declValue) {
	const regexes = ['(#([0-9a-f]{3}){1,2})', 'rgba?\\([^\\)]+\\)'];
	let match = null;

	_.forEach(regexes, (regex) => {
		regex = new RegExp(regex, 'gi');

		if (regex.test(declValue)) {
			match = declValue.match(regex)[0];
		}
	});

	return match;
}

/**
 * Simple helper to avoid collisions with group names.
 * @param  {Boolean} toggle
 * @return {Function}
 */
export function maskGroup(toggle = false) {
	const input = new RegExp(`[${toggle ? GROUP_DELIMITER :  GROUP_MASK }]`, 'gi');
	const output = toggle ? GROUP_MASK : GROUP_DELIMITER;

	return value => value.replace(input, output);
}

/**
 * Checkes whether all images are retina.
 * @param  {Array} images
 * @return {Boolean}
 */
export function areRetinaImages(images) {
	return _.every(images, image => image.retina);
}

/**
 * Generate the filepath to the sprite.
 * @param  {Object}  opts
 * @param  {Array}   groups
 * @return {String}
 */
export function makeSpritesheetPath(opts, groups = []) {
	return path.join(opts.spritePath, ['sprite', ...groups, 'png'].join('.'));
}

/**
 * Check whether the comment is token that
 * should be replaced with background declarations.
 * @param  {String}  commentValue
 * @return {Boolean}
 */
export function isToken(commentValue) {
	return commentValue.indexOf(COMMENT_TOKEN_PREFIX) > -1;
}
