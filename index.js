'use strict';

/**
 * Module dependencies.
 */
var fs          = require('fs');
var path        = require('path');
var util        = require('util');
var postcss     = require('postcss');
var lodash      = require('lodash');
var async       = require('async');
var Q           = require('q');
var spritesmith = require('spritesmith');
var mkdirp      = require('mkdirp');

/**
 * Constants.
 *
 * @type {String}
 */
var GROUP_DELIMITER   = '.';
var GROUP_MASK        = '*';
var BACKGROUND        = 'background';
var BACKGROUND_IMAGE  = 'background-image';
var BACKGROUND_COLOR  = 'background-color';
var BACKGROUND_REPEAT = 'background-repeat';
var BACKGROUND_SIZE   = 'background-size';
var TEMPLATES         = {
	REGULAR: './templates/regular.lodash',
	RETINA : './templates/retina.lodash'
};

/**
 * Defaults.
 *
 * @type {Object}
 */
var defaults = {
	externalStyle : false,
	spritePath    : null,
	spriteName    : 'sprite.png',
	filterBy      : [],
	groupBy       : [],
	retina        : false,
	verbose       : false,

	// spritesmith options
	engine        : 'pixelsmith',
	algorithm     : 'binary-tree',
	padding       : 0,
	engineOpts    : {},
	exportOpts    : {}
};

/**
 * Register the PostCSS plugin.
 */
module.exports = postcss.plugin('postcss-sprites', plugin);

/**
 * PostCSS plugin definition.
 *
 * @param  {Object}  opts
 * @return {Function}
 */
function plugin(opts) {
	// Extend default options.
	var options = lodash.merge(defaults, opts || {});

	// Prepare filterBy functions.
	setupFilterBy(options);

	// Prepare groupBy functions.
	setupGroupBy(options);

	// Plugin initializer.
	return function(css) {
		return Q
			.all([getImages(css, options), options])
			.spread(applyFilterBy)
			.spread(applyGroupBy)
			.spread(runSpriteSmith)
			.spread(saveSprites)
			.spread(mapSpritesProperties)
			.spread(function(images, opts, sprites) {
				return updateReferences(images, opts, sprites, css);
			})
			.spread(preloadTemplates)
			.spread(saveExternalStyle)
			.then(function() {
				log('Done.', options.verbose);
			})
			.catch(function(err) {
				if (err) {
					log('Error: ' + err, options.verbose);
				}
			});
	}
}

/**
 * Return all images that can be used
 * to generate a sprite.
 *
 * @param  {Object} css
 * @param  {Object} opts
 * @return {Array}
*/
function getImages(css, opts) {
	var images        = [];
	var styleFilePath = css.source.input.file;

	// Find only background & background-image declarations.
	css.eachRule(function(rule) {
		// The host object
		// for each found image.
		var image = {
			path    : null,
			url     : null,
			retina  : false,
			ratio   : 1,
			groups  : [],
			token   : '',
			selector: null
		};
		var color;

		// Manipulate only rules with background image
		// in them.
		if (hasImageInRule(rule.toString())) {
			image.url = getImageUrl(rule.toString());

			if (isImageSupported(image.url)) {
				rule.eachDecl(/^background/, function(decl) {
					// We remove these declarations since
					// our plugin will insert them when
					// they are necessary.
					if (decl.prop === BACKGROUND_REPEAT || decl.prop === BACKGROUND_SIZE) {
						decl.removeSelf();
					}

					if (decl.prop === BACKGROUND) {
						color = getColor(decl);

						// Extract color to background-color propery
						if (color && color.length === 1) {
							rule.append({
								prop: 'background-color',
								value: color[0],
								before: ' '
							});
						}
					}

					if (decl.prop === BACKGROUND || decl.prop === BACKGROUND_IMAGE) {
						image.token = postcss.comment({
							text: image.url,
							before: ' ',
							left: '@replace|',
							right: ''
						});

						// Replace the declaration with a comment token
						// which will be used later for reference.
						decl.replaceWith(image.token);
					}
				});

				// Perform search for retina
				// images if option is allowed.
				if (opts.retina && isRetinaImage(image.url)) {
					image.retina = true;
					image.ratio  = getRetinaRatio(image.url);
				}

				// Get the path to the image.
				image.path = path.resolve(styleFilePath.substring(0, styleFilePath.lastIndexOf(path.sep)), image.url);

				// Extract the selector for usage in
				// the external stylesheet.
				image.selector = getSelector(image.url);

				images.push(image);
			} else {
				log('Skip ' + image.url + ' - not supported.', opts.verbose);
			}
		}
	});

	// Remove duplicates and empty values
	images = lodash
		.chain(images)
		.unique(function(image) {
			return image.path;
		})
		.value();

	return images;
}

/**
 * Prepare functions that will be used
 * to filtering the images.
 *
 * @param  {Object} opts
 * @return
 */
function setupFilterBy(opts) {
	// Convert user function to array
	if (lodash.isFunction(opts.filterBy)) {
		opts.filterBy = [opts.filterBy];
	}

	// Remove non existing images
	opts.filterBy.unshift(function(image) {
		return Q.Promise(function(resolve, reject) {
			fs.exists(image.path, function(exists) {
				if (!exists) {
					log('Skip ' + image.url + ' - not exist.',  opts.verbose);
				}

				resolve(exists);
			});
		});
	});
}

/**
 * Apply filterBy functions.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @return {Promise}
 */
function applyFilterBy(images, opts) {
	return Q.Promise(function(resolve, reject) {
		async.reduce(opts.filterBy, images, function(images, filter, next) {
			async.filter(images, function(image, ok) {
				Q(filter(image))
					.then(ok);
			}, function(images) {
				next(null, images);
			});
		}, function(err, images) {
			if (err) {
				return reject(err);
			}

			resolve([images, opts]);
		});
	});
}

/**
 * Prepare functions that will be used
 * to group the images.
 *
 * @param  {Object} opts
 * @return
 */
function setupGroupBy(opts) {
	// Convert user function to array
	if (lodash.isFunction(opts.groupBy)) {
		opts.groupBy = [opts.groupBy];
	}

	// Group retina images
	if (opts.retina) {
		opts.groupBy.unshift(function(image) {
			if (image.retina) {
				return '@' + image.ratio + 'x';
			}

			return null;
		});
	}
}

/**
 * Apply groupBy functions.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @return {Promise}
 */
function applyGroupBy(images, opts) {
	return Q.Promise(function(resolve, reject) {
		async.reduce(opts.groupBy, images, function(images, group, next) {
			async.map(images, function(image, done) {
				Q(group(image))
					.then(function(group) {
						if (group) {
							image.groups.push(group);
						}

						done(null, image);
					})
					.catch(done);
			}, next);
		}, function(err, images) {
			if (err) {
				return reject(err);
			}

			resolve([images, opts]);
		});
	});
}

/**
 * Process the images with spritesmith module.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @return {Promise}
 */
function runSpriteSmith(images, opts) {
	return Q.Promise(function(resolve, reject) {
		var all = lodash
			.chain(images)
			.groupBy(function (image) {
				var temp;

				temp = image.groups.map(mask(true));
				temp.unshift('_');

				return temp.join(GROUP_DELIMITER);
			})
			.map(function(images, temp) {
				var config = lodash.merge({}, opts, {
					src: lodash.pluck(images, 'path')
				});
				var ratio;

				// Enlarge padding for retina images
				if (areAllRetina(images)) {
					ratio = lodash
						.chain(images)
						.flatten('ratio')
						.unique()
						.value();

					if (ratio.length === 1) {
						config.padding = config.padding * ratio[0];
					}
				}

				return Q.nfcall(spritesmith, config)
					.then(function(result) {
						temp = temp.split(GROUP_DELIMITER);
						temp.shift();

						// Append info about sprite group
						result.groups = temp.map(mask(false));

						return result;
					});
			})
			.value();

		Q.all(all)
			.then(function(results) {
				resolve([images, opts, results]);
			})
			.catch(function(err) {
				if (err) {
					reject(err);
				}
			})
	});
}

/**
 * Export sprites to files.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @param  {Array}  sprites
 * @return {Promise}
 */
function saveSprites(images, opts, sprites) {
	return Q.Promise(function(resolve, reject) {
		var all = lodash
			.chain(sprites)
			.map(function(sprite) {
				sprite.path = makeSpritePath(opts, sprite.groups);

				return Q.nfcall(fs.writeFile, sprite.path, new Buffer(sprite.image, 'binary'))
					.then(function() {
						log(util.format('Spritesheet %s generated.', sprite.path), opts.verbose);

						return sprite;
					});
			})
			.value();

		Q.all(all)
			.then(function(sprites) {
				resolve([images, opts, sprites]);
			})
			.catch(function(err) {
				if (err) {
					reject(err);
				}
			});
	});
}

/**
 * Map properties for every image.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @param  {Array}  sprites
 * @return {Promise}
 */
function mapSpritesProperties(images, opts, sprites) {
	return Q.Promise(function(resolve, reject) {
		sprites = lodash.map(sprites, function(sprite) {
			return lodash.map(sprite.coordinates, function (coordinates, imagePath) {
				return lodash.merge(lodash.find(images, { path: imagePath }), {
					coordinates: coordinates,
					spritePath: sprite.path,
					properties: sprite.properties
				});
			});
		});

		resolve([images, opts, sprites]);
	});
}

/**
 * Update the CSS references.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @param  {Array}  sprites
 * @param  {Object} css
 * @return {Promise}
 */
function updateReferences(images, opts, sprites, css) {
	return Q.Promise(function(resolve, reject) {
		css.eachComment(function(comment) {
			var image, backgroundImage, backgroundPosition, backgroundSize;

			// Manipulate only token comments
			if (isToken(comment)) {
				image = lodash.find(images, { url: comment.text });

				if (image) {
					// Fix path to the sprite
					image.spriteRef = path.relative(path.dirname(css.source.input.file), image.spritePath);
					image.spriteRef = image.spriteRef.replace(path.sep, '/', 'g');

					backgroundImage = postcss.decl({
						prop: 'background-image',
						value: getBackgroundImageUrl(image)
					});

					backgroundPosition = postcss.decl({
						prop: 'background-position',
						value: getBackgroundPosition(image)
					});

					// Replace the comment and append necessary properties.
					comment.replaceWith(backgroundImage);
					backgroundImage.parent.insertAfter(backgroundImage, backgroundPosition);

					if (image.retina) {
						backgroundSize = postcss.decl({
							prop: 'background-size',
							value: getBackgroundSize(image)
						});

						backgroundPosition.parent.insertAfter(backgroundPosition, backgroundSize);
					}
				}
			}
		});

		resolve([images, opts, sprites, css]);
	});
}

/**
 * Read and preload lodash templates
 * for the external stylesheet.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @param  {Array}  sprites
 * @param  {Object} css
 * @return {Promise}
 */
function preloadTemplates(images, opts, sprites, css) {
	if (!opts.externalStyle) {
		return Q([images, opts, sprites, css]);
	}

	return Q.Promise(function(resolve, reject) {
		var all = lodash
			.chain(TEMPLATES)
			.map(function(templatePath, templateKey) {
				return Q.nfcall(fs.readFile, path.resolve(__dirname, templatePath), 'utf-8')
					.then(function(data) {
						return {
							key: templateKey,
							fn : lodash.template(data, { imports: {
								getBackgroundPosition: getBackgroundPosition,
								getBackgroundSize    : getBackgroundSize,
								getBackgroundImageUrl: getBackgroundImageUrl
							}})
						};
					});
			})
			.value();

		Q.all(all)
			.then(function(templates) {
				resolve([images, opts, templates]);
			})
			.catch(function(err) {
				if (err) {
					reject(err);
				}
			});
	});
}

/**
 * Save an external stylesheet only
 * with sprite properties.
 *
 * @param  {Array}  images
 * @param  {Object} opts
 * @param  {Array}  templates
 * @return {Promise}
 */
function saveExternalStyle(images, opts, templates) {
	if (!opts.externalStyle) {
		return Q([images, opts, templates]);
	}

	if (!images.length) {
		log('Skip external stylesheet, because there is no images.', opts.verbose);
		return Q([images, opts, templates]);
	}

	return Q.Promise(function(resolve, reject) {
		var css = '';

		// Group by ratio
		var grouped = lodash
			.chain(images)
			.groupBy(function(image) {
				return image.ratio;
			})
			.value();

		// Create output folder
		var stylePath = path.resolve(path.dirname(opts.externalStyle));

		if (!fs.existsSync(stylePath)) {
			mkdirp.sync(stylePath);
		}

		// Generate the CSS code
		lodash.forEach(grouped, function(images, ratio) {
			var data     = {};
			var isRetina = lodash.parseInt(ratio) > 1;
			var tplKey   = isRetina ? 'RETINA' : 'REGULAR';
			var tpl      = lodash.find(templates, { key: tplKey });

			data.selectors = lodash
				.chain(images)
				.pluck('selector')
				.map(function(selector) {
					return (isRetina ? '\t.' : '.') + selector;
				})
				.value();

			data.images = images;

			css += tpl.fn(data);
			css += '\n';
 		});

 		Q.nfcall(fs.writeFile, opts.externalStyle, css)
 			.then(function() {
 				log(util.format('External stylsheet %s generated.', path.basename(opts.externalStyle)), opts.verbose);

 				resolve();
 			});
	});
}

/**
 * Output a message to the console.
 *
 * @param  {String}  message
 * @param  {Boolean} verbose
 * @return
 */
function log(message, verbose) {
	if (message && !verbose) {
		util.log(util.format('[postcss-sprites] => %s', message));
	}
}

/**
 * Check that the declaration is background.
 * E.g. background-image, background, etc.
 *
 * @param  {Object}  decl
 * @return {Boolean}
 */
function isBackgroundDecl(decl) {
	return /^background/gi.test(decl.prop);
}

/**
 * Check for url in the given rule.
 *
 * @param  {String}  rule
 * @return {Boolean}
 */
function hasImageInRule(rule) {
	return /background[^:]*.*url[^;]+;/gi.test(rule);
}

/**
 * Extract the path to image from the url in given rule.
 *
 * @param  {String} rule
 * @return {String}
 */
function getImageUrl(rule) {
	var match = /background[^:]*:.*url\(([\S]+)\)/gi.exec(rule);

	return match ? match[1].replace(/['"]/gi, '') : '';
}

/**
 * Extract the background color from declaration.
 *
 * @param  {Object} decl
 * @return {String|null}
 */
function getColor(decl) {
	return decl.value.match(/(?:\s*)(#([0-9a-f]{3}){1,2})/gi);
}

/**
 * Check whether the image is supported.
 *
 * @param  {String}  url
 * @return {Boolean}
 */
function isImageSupported(url) {
	var httpRegex   = /http[s]?/gi;
	var pngRegex    = /\.*png$/gi;

	return pngRegex.test(url) && !httpRegex.test(url);
}

/**
 * Check whether the image is retina.
 * @param  {String}  url
 * @return {Boolean}
 */
function isRetinaImage(url) {
	return /@(\d)x\.[a-z]{3,4}$/gi.test(url);
}

/**
 * Return the retina ratio.
 *
 * @param  {String} url
 * @return {Number}
 */
function getRetinaRatio(url) {
	var matches = /@(\d)x\.[a-z]{3,4}$/gi.exec(url);
	var ratio   = lodash.parseInt(matches[1]);

	return ratio;
}

/**
 * Check whether all images are retina.
 *
 * @param  {Array}  images
 * @return {Boolean}
 */
function areAllRetina(images) {
	return lodash.every(images, function(image) {
		return image.retina;
	});
}

/**
 * Simple helper to avoid collisions
 * with group names symbols.
 *
 * @param  {Boolean} toggle
 * @return {Function}
 */
function mask(toggle) {
	var input  = new RegExp('[' + (toggle ? GROUP_DELIMITER : GROUP_MASK) + ']', 'gi');
	var output = toggle ? GROUP_MASK : GROUP_DELIMITER;

	return function(value) {
		return value.replace(input, output);
	}
}

/**
 * Generate a path to the sprite.
 *
 * @param  {Object} opts
 * @param  {Array}  groups
 * @return {String}
 */
function makeSpritePath(opts, groups) {
	var groups   = groups || [];
	var basePath = opts.spritePath || '';
	var filePath;

	if (!groups.length) {
		return path.join(basePath, opts.spriteName);
	}

	filePath = opts.spriteName.split('.');
	Array.prototype.splice.apply(filePath, [filePath.length - 1, 0].concat(groups));

	return path.join(basePath, filePath.join('.'));
}

/**
 * Check whether the comment is token that
 * should be replaced with CSS declarations.
 *
 * @param  {Object}  comment
 * @return {Boolean}
 */
function isToken(comment) {
	return /@replace/gi.test(comment.toString());
}

/**
 * Return the value for background-image property.
 *
 * @param  {Object} image
 * @return {String}
 */
function getBackgroundImageUrl(image) {
	var template = lodash.template('url(<%= image.spriteRef %>)');

	return template({ image: image });
}

/**
 * Return the value for background-position property.
 *
 * @param  {Object} image
 * @return {String}
 */
function getBackgroundPosition(image) {
	var x        = -1 * (image.retina ? image.coordinates.x / image.ratio : image.coordinates.x);
	var y        = -1 * (image.retina ? image.coordinates.y / image.ratio : image.coordinates.y);
	var template = lodash.template("<%= (x ? x + 'px' : x) %> <%= (y ? y + 'px' : y) %>");

	return template({ x: x, y: y });
}

/**
 * Return the value for background-size property.
 *
 * @param  {Object} image
 * @return {String}
 */
function getBackgroundSize(image) {
	var x        = image.properties.width / image.ratio;
	var y        = image.properties.height / image.ratio;
	var template = lodash.template("<%= x %>px <%= y %>px");

	return template({ x: x, y: y });
}

/**
 * Return a CSS selector based on the file name.
 *
 * @param  {String} filePath
 * @return {String}
 */
function getSelector(filePath) {
	var name = path.basename(filePath);

	return name.replace(/(@\d+x)?\..+$/gi, '');
}
