'use strict';

exports.__esModule = true;
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
exports.makeSpritesheetPath = makeSpritesheetPath;
exports.isToken = isToken;
exports.createLogger = createLogger;

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _raster = require('./factories/raster');

var _raster2 = _interopRequireDefault(_raster);

var _vector = require('./factories/vector');

var _vector2 = _interopRequireDefault(_vector);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
var TYPE_RASTER = 'raster';
var TYPE_VECTOR = 'vector';

/**
 * Plugin defaults.
 */
var defaults = exports.defaults = {
	basePath: './',
	stylesheetPath: null,
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
	},
	svgsprite: {
		mode: {
			css: {
				dimensions: true,
				bust: false,
				render: {
					css: true
				}
			}
		},

		shape: {
			id: {
				generator: function generator(name, file) {
					return new Buffer(file.path).toString('base64');
				}
			}
		},

		svg: {
			precision: 5
		}
	},
	verbose: false
};

/**
 * Prepares the filter functions.
 * @param  {Object} opts
 * @param  {Result} result
 * @return
 */
function prepareFilterBy(opts, result) {
	if (_lodash2.default.isFunction(opts.filterBy)) {
		opts.filterBy = [opts.filterBy];
	}

	// Filter non existing images
	opts.filterBy.unshift(function (image) {
		return _fsExtra2.default.statAsync(image.path).catch(function () {
			var message = 'Skip ' + image.url + ' because doesn\'t exist.';

			opts.logger(message);

			throw new Error(message);
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

			return _bluebird2.default.reject(new Error('Not a retina image.'));
		});
	}

	// Group by type - 'vector' or 'raster'
	opts.groupBy.unshift(function (image) {
		if (/^\.svg/.test(_path2.default.extname(image.path))) {
			return _bluebird2.default.resolve(TYPE_VECTOR);
		}

		return _bluebird2.default.resolve(TYPE_RASTER);
	});
}

/**
 * Walks the given CSS string and extracts all images
 * that can be converted to sprite.
 * @param  {Node}   root
 * @param  {Object} opts
 * @param  {Result} result
 * @return {Promise}
 */
function extractImages(root, opts, result) {
	var images = [];

	opts.logger('Extracting the images...');

	// Search for background & background image declartions
	root.walkRules(function (rule) {
		var styleFilePath = opts.relativeTo === RELATIVE_TO_RULE ? rule.source.input.file : root.source.input.file;
		var ABSOLUTE_URL = /^\//;

		// The host object of found image
		var image = {
			path: null,
			url: null,
			originalUrl: null,
			retina: false,
			ratio: 1,
			groups: [],
			token: '',
			styleFilePath: styleFilePath
		};

		// Manipulate only rules with image in them
		if (hasImageInRule(rule.toString())) {
			var imageUrl = getImageUrl(rule.toString());
			image.originalUrl = imageUrl[0];
			image.url = imageUrl[1];

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
				opts.logger('Skip ' + image.url + ' because isn\'t supported.');
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
	opts.logger('Applying the filters...');

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
	opts.logger('Applying the groups...');

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
                repeat = void 0,//2019-12-10
			    backgroundColorDecl = void 0,
			    commentDecl = void 0;

			if (!hasImageInRule(ruleStr)) {
				return;
			}

			// Manipulate only rules with image in them

			url = getImageUrl(ruleStr)[1];
			image = _lodash2.default.find(images, { url: url });

			if (!image) {
				return;
			}

			// Remove all necessary background declarations  
			rule.walkDecls(/^background-(repeat|size|position)$/, function (decl) {
				return decl.remove();
			});


			// Extract color to background-color property
			if (decl.prop === BACKGROUND) {
				color = getColor(decl.value);

				if (color) {
					decl.cloneAfter({
						prop: 'background-color',
						value: color
					}).raws.before = ONE_SPACE;
				}
			}
            
            // Extract repeat to background-repeat property 2019-12-10
            if (decl.prop === BACKGROUND) {
            	repeat = getRepeat(decl.value);
            
            	if (repeat) {
            		decl.cloneAfter({
            			prop: 'background-repeat',
            			value: repeat
            		}).raws.before = ONE_SPACE;
            	}
            }
            
            

			// Replace with comment token
			if (_lodash2.default.includes([BACKGROUND, BACKGROUND_IMAGE], decl.prop)) {
				commentDecl = decl.cloneAfter({
					type: 'comment',
					text: image.url
				});

				commentDecl.raws.left = '' + ONE_SPACE + COMMENT_TOKEN_PREFIX;
				image.token = commentDecl.toString();

				decl.remove();
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
	opts.logger('Generating the spritesheets...');

	return new _bluebird2.default(function (resolve, reject) {
		var promises = _lodash2.default.chain(images).groupBy(function (image) {
			var tmp = image.groups.map(maskGroup(true));
			tmp.unshift('_');

			return tmp.join(GROUP_DELIMITER);
		}).map(function (images, tmp) {
			var factory = tmp.indexOf(TYPE_VECTOR) > -1 ? _vector2.default : _raster2.default;

			return factory(opts, images).then(function (spritesheet) {
				// Remove the '_', 'raster' or 'vector' prefixes
				tmp = tmp.split(GROUP_DELIMITER).splice(2);

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
	opts.logger('Saving the spritesheets...');

	return _bluebird2.default.each(spritesheets, function (spritesheet) {
		return (_lodash2.default.isFunction(opts.hooks.onSaveSpritesheet) ? _bluebird2.default.resolve(opts.hooks.onSaveSpritesheet(opts, spritesheet)) : _bluebird2.default.resolve(makeSpritesheetPath(opts, spritesheet))).then(function (res) {
			if (!res) {
				throw new Error('postcss-sprites: Spritesheet requires a relative path.');
			}

			if (_lodash2.default.isString(res)) {
				spritesheet.path = res;
			} else {
				_lodash2.default.assign(spritesheet, res);
			}

			spritesheet.path = spritesheet.path.replace(/\\/g, '/');

			return _fsExtra2.default.outputFileAsync(spritesheet.path, spritesheet.image);
		});
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
		var coordinates = _ref.coordinates,
		    path = _ref.path,
		    properties = _ref.properties;

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
	opts.logger('Replacing the references...');

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
				image.spriteUrl = _path2.default.relative(opts.stylesheetPath || _path2.default.dirname(root.source.input.file), image.spritePath);
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
	var retina = image.retina,
	    ratio = image.ratio,
	    coords = image.coords,
	    spriteUrl = image.spriteUrl,
	    spriteWidth = image.spriteWidth,
	    spriteHeight = image.spriteHeight;
        
	var posX = -1 * Math.abs(coords.x / ratio);
	var posY = -1 * Math.abs(coords.y / ratio);
	var sizeX = spriteWidth / ratio;
	var sizeY = spriteHeight / ratio;

	token.cloneAfter({
		type: 'decl',
		prop: 'background-image',
		value: 'url(' + spriteUrl + ')'
	}).cloneAfter({
		prop: 'background-position',
		value: posX + 'px ' + posY + 'px'
	}).cloneAfter({
		prop: 'background-size',
		value: sizeX + 'px ' + sizeY + 'px'
	});
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
 * @return {Array}
 */
function getImageUrl(rule) {
	var matches = /url(?:\(['"]?)(.*?)(?:['"]?\))/gi.exec(rule);
	var original = '';
	var normalized = '';

	if (matches) {
		original = matches[1];
		normalized = original.replace(/['"]/gi, '') // replace all quotes
		.replace(/\?.*$/gi, ''); // replace query params
	}

	return [original, normalized];
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


/**2019-12-10
 * Extracts the repeat from background declaration.
 * @param  {String}  declValue
 * @return {String?}
 */
function getRepeat(declValue) {
	var regexes = ['no\\-repeat', 'repeat\\-x', 'repeat\\-y'];
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
	var toggle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;

	var input = new RegExp('[' + (toggle ? GROUP_DELIMITER : GROUP_MASK) + ']', 'gi');
	var output = toggle ? GROUP_MASK : GROUP_DELIMITER;

	return function (value) {
		return value.replace(input, output);
	};
}

/**
 * Generate the filepath to the sprite.
 * @param  {Object}  opts
 * @param  {Object}  spritesheet
 * @return {String}
 */
function makeSpritesheetPath(opts, _ref2) {
	var groups = _ref2.groups,
	    extension = _ref2.extension;

	return _path2.default.join(opts.spritePath, ['sprite'].concat(groups, [extension]).join('.'));
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

/**
 * Create a logger that can be disabled in runtime.
 *
 * @param  {Boolean} enabled
 * @return {Function}
 */
function createLogger(enabled) {
	if (enabled) {
		_debug2.default.enable('postcss-sprites');
	}

	return (0, _debug2.default)('postcss-sprites');
}
