'use strict';

/**
 * Module dependencies.
 */
var path       = require('path');
var fs         = require('fs');
var tape       = require('tape');
var postcss    = require('postcss');
var plugin     = require('../');
var pluginName = require('../package.json').name;
var testRoot   = path.resolve(__dirname, '.');

/**
 * Tests.
 */
tape('should use PostCSS Plugin API', function(t) {
	t.plan(2);
	t.ok(plugin().postcssVersion, 'should be able to access PostCSS version');
	t.equal(plugin().postcssPlugin, pluginName, 'should be able to access plugin name');
});

tape('should create a sprite and update references in stylesheet', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.basic.png'),
		verbose       : true
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.basic.css'),
		to    : path.resolve(testRoot, './build/style.basic.css'),
		expect: path.resolve(testRoot, './expectations/style.basic.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated');
		})
});

tape('should extract hex, rgba and rgb colors as background-color', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.basic-color.png'),
		verbose       : true
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.basic-color.css'),
		to    : path.resolve(testRoot, './build/style.basic-color.css'),
		expect: path.resolve(testRoot, './expectations/style.basic-color.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated, color extracted');
		});
});

tape('should create retina sprite and update references in stylesheet', function(t) {
	t.plan(3);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.retina.png'),
		verbose       : true,
		retina        : true
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.retina.css'),
		to    : path.resolve(testRoot, './build/style.retina.css'),
		expect: path.resolve(testRoot, './expectations/style.retina.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.ok(fs.existsSync(path.resolve(path.dirname(pluginOpts.spritePath), 'sprite.retina.@2x.png')), 'sprite@2x created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should filter and group images', function(t) {
	t.plan(3);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.fg.png'),
		verbose       : true,
		groupBy       : function(image) {
			// our custom retina grouper
			var regex = /@\d+x/gi;

			if (regex.test(image.url)) {
				return 'retina';
			}

			return null;
		},
		filterBy   : function(image) {
			return !/not-exist/gi.test(image.url);
		}
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.fg.css'),
		to    : path.resolve(testRoot, './build/style.fg.css'),
		expect: path.resolve(testRoot, './expectations/style.fg.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.ok(fs.existsSync(path.resolve(path.dirname(pluginOpts.spritePath), 'sprite.fg.retina.png')), 'sprite@retina created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should allow images different than PNG', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.jpeg.jpg'),
		verbose       : true,
		padding       : 2
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.jpg.css'),
		to    : path.resolve(testRoot, './build/style.jpg.css'),
		expect: path.resolve(testRoot, './expectations/style.jpg.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should output dimensions when outputDimensions option is true', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath  : path.resolve(testRoot, './build'),
		spritePath      : path.resolve(testRoot, './build/sprite.basic.png'),
		outputDimensions: true,
		verbose         : true
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.basic.css'),
		to    : path.resolve(testRoot, './build/style.basic.css'),
		expect: path.resolve(testRoot, './expectations/style.basic-dimensions.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated, dimensions included');
		})
});

tape('should output dimensions for retina images when outputDimensions option is true', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.retina.png'),
		verbose       : true,
		retina        : true,
		outputDimensions: true
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.retina.css'),
		to    : path.resolve(testRoot, './build/style.retina.css'),
		expect: path.resolve(testRoot, './expectations/style.basic-dimensions-with-retina.css')
	};

	var processor   = postcss([plugin(pluginOpts)]);
	var css         = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated, dimensions included');
		})
});

tape('should respect skipPrefix option', function(t) {
	t.plan(2);

	var pluginOpts = {
		stylesheetPath: path.resolve(testRoot, './build'),
		spritePath    : path.resolve(testRoot, './build/sprite.png'),
		skipPrefix    : true,
		verbose       : true,
		groupBy       : function(image) {
			// our custom retina grouper
			var regex = /@\d+x/gi;

			if (regex.test(image.url)) {
				return 'retina';
			}

			return null;
		},
		filterBy   : function(image) {
			return !/not-exist/gi.test(image.url);
		}
	};
	var processOpts = {
		from  : path.resolve(testRoot, './fixtures/style.fg.css')
	};

	var processor = postcss([plugin(pluginOpts)]);
	var css       = fs.readFileSync(processOpts.from, { encoding: 'utf8' });

	processor
		.process(css, processOpts)
		.then(function(result) {
			t.ok(fs.existsSync(pluginOpts.spritePath), 'sprite created');
			t.ok(fs.existsSync(path.resolve(path.dirname(pluginOpts.spritePath), 'retina.png')), 'sprite@retina created');
		});
});
