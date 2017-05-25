'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.defaults = undefined;
exports.prepareFilterBy = prepareFilterBy;
exports.prepareGroupBy = prepareGroupBy;
exports.extractImages = extractImages;
exports.applyFilterBy = applyFilterBy;
exports.applyGroupBy = applyGroupBy;
exports.setTokens = setTokens;
exports.runSpritesmith = runSpritesmith;
exports.saveSpritesheets = saveSpritesheets;
exports.mapSpritesheetProps = mapSpritesheetProps;
exports.updateReferences = updateReferences;
exports.updateRule = updateRule;
exports.hasImageInRule = hasImageInRule;
exports.getImageUrl = getImageUrl;
exports.isImageSupported = isImageSupported;
exports.isRetinaImage = isRetinaImage;
exports.getRetinaRatio = getRetinaRatio;
exports.getColor = getColor;
exports.maskGroup = maskGroup;
exports.areRetinaImages = areRetinaImages;
exports.makeSpritesheetPath = makeSpritesheetPath;
exports.isToken = isToken;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _spritesmith = require('spritesmith');

var _spritesmith2 = _interopRequireDefault(_spritesmith);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

/**
 * Wrap with promises.
 */
_bluebird2.default.promisifyAll(_fsExtra2.default);

/**
 * Plugin constants.
 */
var RELATIVE_TO_FILE = 'file';
var RELATIVE_TO_RULE = 'rule';
var BACKGROUND = 'background';
var BACKGROUND_IMAGE = 'background-image';
var ONE_SPACE = ' ';
var COMMENT_TOKEN_PREFIX = '@replace|';
var GROUP_DELIMITER = '.';
var GROUP_MASK = '*';

/**
 * Plugin defaults.
 */
var defaults = exports.defaults = {
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
exports.default = _postcss2.default.plugin('postcss-sprites', function () {
	var opts = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

	return function (css, result) {
		// Extend defaults
		opts = _lodash2.default.merge({}, defaults, opts);

		// Prepare filter & group functions
		prepareFilterBy(opts);
		prepareGroupBy(opts);

		// Process it
		return extractImages(css, opts).spread(function (opts, images) {
			return applyFilterBy(opts, images);
		}).spread(function (opts, images) {
			return applyGroupBy(opts, images);
		}).spread(function (opts, images) {
			return setTokens(css, opts, images);
		}).spread(function (root, opts, images) {
			return runSpritesmith(opts, images);
		}).spread(function (opts, images, spritesheets) {
			return saveSpritesheets(opts, images, spritesheets);
		}).spread(function (opts, images, spritesheets) {
			return mapSpritesheetProps(opts, images, spritesheets);
		}).spread(function (opts, images, spritesheets) {
			return updateReferences(css, opts, images, spritesheets);
		}).spread(function (root, opts, images, spritesheets) {
			console.log('postcss-sprites: ' + spritesheets.length + ' ' + (spritesheets.length > 1 ? 'spritesheets' : 'spritesheet') + ' generated.');
		}).catch(function (err) {
			console.error('postcss-sprites: An error occurred while processing files - ' + err.message);
			console.error(err.stack);
			throw err;
		});
	};
});

/**
 * Prepares the filter functions.
 * @param  {Object} opts
 * @return
 */

function prepareFilterBy(opts) {
	if (_lodash2.default.isFunction(opts.filterBy)) {
		opts.filterBy = [opts.filterBy];
	}

	// Filter non existing images
	opts.filterBy.unshift(function (image) {
		return _fsExtra2.default.statAsync(image.path).catch(function () {
			console.log('postcss-sprites: Skip ' + image.url + ' because doesn\'t exist.');
			throw new Error();
		});
	});
}

/**
 * Prepares the group functions.
 * @param  {Object} opts
 * @return
 */
function prepareGroupBy(opts) {
	if (_lodash2.default.isFunction(opts.groupBy)) {
		opts.groupBy = [opts.groupBy];
	}

	// Group by retina ratio
	if (opts.retina) {
		opts.groupBy.unshift(function (image) {
			if (image.retina) {
				return _bluebird2.default.resolve('@' + image.ratio + 'x');
			}

			return _bluebird2.default.reject();
		});
	}
}

/**
 * Walks the given CSS string and extracts all images
 * that can be converted to sprite.
 * @param  {Node}   root
 * @param  {Object} opts
 * @return {Promise}
 */
function extractImages(root, opts) {
	var images = [];

	// Search for background & background image declartions
	root.walkRules(function (rule) {
		var styleFilePath = opts.relativeTo === RELATIVE_TO_RULE ? rule.source.input.file : root.source.input.file;
		var ABSOLUTE_URL = /^\//;

		// The host object of found image
		var image = {
			path: null,
			url: null,
			retina: false,
			ratio: 1,
			groups: [],
			token: ''
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
					image.path = _path2.default.resolve(opts.basePath + image.url);
				} else {
					image.path = _path2.default.resolve(_path2.default.dirname(styleFilePath), image.url);
				}

				images.push(image);
			} else {
				console.log('postcss-sprites: Skip ' + image.url + ' because isn\'t supported.');
			}
		}
	});

	// Remove duplicates and empty values
	images = _lodash2.default.uniqBy(images, 'path');

	return _bluebird2.default.resolve([opts, images]);
}

/**
 * Apply filterBy functions over collection of exported images.
 * @param  {Object}  opts
 * @param  {Array}   images
 * @return {Promise}
 */
function applyFilterBy(opts, images) {
	return _bluebird2.default.reduce(opts.filterBy, function (images, filterFn) {
		return _bluebird2.default.filter(images, function (image) {
			return filterFn(image).then(function () {
				return true;
			}).catch(function () {
				return false;
			});
		}, { concurrency: 1 });
	}, images).then(function (images) {
		return [opts, images];
	});
}

/**
 * Apply groupBy functions over collection of exported images.
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
function applyGroupBy(opts, images) {
	return _bluebird2.default.reduce(opts.groupBy, function (images, groupFn) {
		return _bluebird2.default.map(images, function (image) {
			return groupFn(image).then(function (group) {
				image.groups.push(group);
				return image;
			}).catch(function () {
				return image;
			});
		});
	}, images).then(function (images) {
		return [opts, images];
	});
}

/**
 * Replaces the background declarations that needs to be updated
 * with a sprite image.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
function setTokens(root, opts, images) {
	return new _bluebird2.default(function (resolve, reject) {
		root.walkDecls(/^background(-image)?$/, function (decl) {
			var rule = decl.parent;
			var ruleStr = rule.toString();
			var url = void 0,
			    image = void 0,
			    color = void 0,
			    backgroundColorDecl = void 0,
			    commentDecl = void 0;

			// Manipulate only rules with image in them
			if (hasImageInRule(ruleStr)) {
				url = getImageUrl(ruleStr);
				image = _lodash2.default.find(images, { url: url });

				if (image) {
					// Remove all necessary background declarations
					rule.walkDecls(/^background-(repeat|size|position)$/, function (decl) {
						return decl.remove();
					});

					// Extract color to background-color property
					if (decl.prop === BACKGROUND) {
						color = getColor(decl.value);

						if (color) {
							backgroundColorDecl = _postcss2.default.decl({
								prop: 'background-color',
								value: getColor(decl.value)
							});
							backgroundColorDecl.raws.before = ONE_SPACE;

							rule.append(backgroundColorDecl);
						}
					}

					// Replace with comment token
					if (decl.prop === BACKGROUND || decl.prop === BACKGROUND_IMAGE) {
						commentDecl = _postcss2.default.comment({
							text: image.url
						});

						commentDecl.raws.left = '' + ONE_SPACE + COMMENT_TOKEN_PREFIX;
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
function runSpritesmith(opts, images) {
	return new _bluebird2.default(function (resolve, reject) {
		var spritesmithRunAsync = _bluebird2.default.promisify(_spritesmith2.default.run, { context: _spritesmith2.default });
		var promises = _lodash2.default.chain(images).groupBy(function (image) {
			var tmp = image.groups.map(maskGroup(true));
			tmp.unshift('_');

			return tmp.join(GROUP_DELIMITER);
		}).map(function (images, tmp) {
			var config = _lodash2.default.merge({}, opts.spritesmith, {
				src: _lodash2.default.map(images, 'path')
			});
			var ratio = void 0;

			// Increase padding to handle retina ratio
			if (areRetinaImages(images)) {
				ratio = _lodash2.default.chain(images).flatten('ratio').uniq().head().value().ratio;

				if (ratio) {
					config.padding = config.padding * ratio;
				}
			}

			return spritesmithRunAsync(config).then(function (spritesheet) {
				tmp = tmp.split(GROUP_DELIMITER);
				tmp.shift();

				spritesheet.groups = tmp.map(maskGroup());

				return spritesheet;
			});
		}).value();

		_bluebird2.default.all(promises).then(function (spritesheets) {
			resolve([opts, images, spritesheets]);
		}).catch(function (err) {
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
function saveSpritesheets(opts, images, spritesheets) {
	return _bluebird2.default.each(spritesheets, function (spritesheet) {
		spritesheet.path = _lodash2.default.isFunction(opts.hooks.onSaveSpritesheet) ? opts.hooks.onSaveSpritesheet(opts, spritesheet.groups) : makeSpritesheetPath(opts, spritesheet.groups);

		if (!spritesheet.path) {
			throw new Error('postcss-sprites: Spritesheet requires a relative path.');
		}

		spritesheet.path = spritesheet.path.replace(/\\/g, '/');

		return _fsExtra2.default.outputFileAsync(spritesheet.path, spritesheet.image);
	}).then(function (spritesheets) {
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
function mapSpritesheetProps(opts, images, spritesheets) {
	_lodash2.default.forEach(spritesheets, function (_ref) {
		var coordinates = _ref.coordinates;
		var path = _ref.path;
		var properties = _ref.properties;

		var spritePath = path;
		var spriteWidth = properties.width;
		var spriteHeight = properties.height;

		_lodash2.default.forEach(coordinates, function (coords, imagePath) {
			_lodash2.default.chain(images).find(['path', imagePath]).merge({
				coords: coords,
				spritePath: spritePath,
				spriteWidth: spriteWidth,
				spriteHeight: spriteHeight
			}).value();
		});
	});

	return _bluebird2.default.resolve([opts, images, spritesheets]);
}

/**
 * Updates the CSS references.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Array}  images
 * @param  {Array}  spritesheets
 * @return {Promise}
 */
function updateReferences(root, opts, images, spritesheets) {
	root.walkComments(function (comment) {
		var rule = void 0,
		    image = void 0;

		// Manipulate only comment tokens
		if (isToken(comment.toString())) {
			rule = comment.parent;
			image = _lodash2.default.find(images, { url: comment.text });

			// Update the rule with background declarations
			if (image) {
				// Generate CSS url to sprite
				image.spriteUrl = _path2.default.relative(opts.stylesheetPath, image.spritePath);
				image.spriteUrl = image.spriteUrl.split(_path2.default.sep).join('/');

				// Update rule
				if (_lodash2.default.isFunction(opts.hooks.onUpdateRule)) {
					opts.hooks.onUpdateRule(rule, comment, image);
				} else {
					updateRule(rule, comment, image);
				}

				// Cleanup token
				comment.remove();
			}
		}
	});

	return _bluebird2.default.resolve([root, opts, images, spritesheets]);
}

/**
 * Update an single CSS rule.
 * @param  {Node}   rule
 * @param  {Node}   token
 * @param  {Object} image
 * @return
 */
function updateRule(rule, token, image) {
	var retina = image.retina;
	var ratio = image.ratio;
	var coords = image.coords;
	var spriteUrl = image.spriteUrl;
	var spriteWidth = image.spriteWidth;
	var spriteHeight = image.spriteHeight;

	var posX = coords.x / ratio;
	var posY = coords.y / ratio;
	var sizeX = spriteWidth / ratio;
	var sizeY = spriteHeight / ratio;

	var backgroundImageDecl = _postcss2.default.decl({
		prop: 'background-image',
		value: 'url(' + spriteUrl + ')'
	});

	var backgroundPositionDecl = _postcss2.default.decl({
		prop: 'background-position',
		value: -1 * posX + 'px ' + -1 * posY + 'px'
	});

	rule.insertAfter(token, backgroundImageDecl);
	rule.insertAfter(backgroundImageDecl, backgroundPositionDecl);

	if (retina) {
		var backgroundSizeDecl = _postcss2.default.decl({
			prop: 'background-size',
			value: sizeX + 'px ' + sizeY + 'px'
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
function hasImageInRule(rule) {
	return (/background[^:]*.*url[^;]+/gi.test(rule)
	);
}

/**
 * Extracts the url of image from the given rule.
 * @param  {String} rule
 * @return {String}
 */
function getImageUrl(rule) {
	var matches = /background[^:]*:.*url\(([\S]+)\)/gi.exec(rule);

	if (!matches) {
		return '';
	}

	return matches[1].replace(/['"]/gi, '') // replace all quotes
	.replace(/\?.*$/gi, ''); // replace query params
}

/**
 * Checks whether the image is supported.
 * @param  {String}  url
 * @return {Boolean}
 */
function isImageSupported(url) {
	var http = /^http[s]?/gi;
	var base64 = /^data\:image/gi;

	return !http.test(url) && !base64.test(url);
}

/**
 * Checks whether the image is retina.
 * @param  {String}  url
 * @return {Boolean}
 */
function isRetinaImage(url) {
	return (/@(\d)x\.[a-z]{3,4}$/gi.test(url)
	);
}

/**
 * Extracts the retina ratio of image.
 * @param  {String} url
 * @return {Number}
 */
function getRetinaRatio(url) {
	var matches = /@(\d)x\.[a-z]{3,4}$/gi.exec(url);

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
function getColor(declValue) {
	var regexes = ['(#([0-9a-f]{3}){1,2})', 'rgba?\\([^\\)]+\\)'];
	var match = null;

	_lodash2.default.forEach(regexes, function (regex) {
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
function maskGroup() {
	var toggle = arguments.length <= 0 || arguments[0] === undefined ? false : arguments[0];

	var input = new RegExp('[' + (toggle ? GROUP_DELIMITER : GROUP_MASK) + ']', 'gi');
	var output = toggle ? GROUP_MASK : GROUP_DELIMITER;

	return function (value) {
		return value.replace(input, output);
	};
}

/**
 * Checkes whether all images are retina.
 * @param  {Array} images
 * @return {Boolean}
 */
function areRetinaImages(images) {
	return _lodash2.default.every(images, function (image) {
		return image.retina;
	});
}

/**
 * Generate the filepath to the sprite.
 * @param  {Object}  opts
 * @param  {Array}   groups
 * @return {String}
 */
function makeSpritesheetPath(opts) {
	var groups = arguments.length <= 1 || arguments[1] === undefined ? [] : arguments[1];

	return _path2.default.join(opts.spritePath, ['sprite'].concat(_toConsumableArray(groups), ['png']).join('.'));
}

/**
 * Check whether the comment is token that
 * should be replaced with background declarations.
 * @param  {String}  commentValue
 * @return {Boolean}
 */
function isToken(commentValue) {
	return commentValue.indexOf(COMMENT_TOKEN_PREFIX) > -1;
}