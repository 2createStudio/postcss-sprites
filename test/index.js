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
		baseUrl   : path.resolve(testRoot, './build'),
		spriteName: 'sprite.basic.png',
		spritePath: path.resolve(testRoot, './build'),
		verbose   : true
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
			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should extract hex, rgba and rgb colors as background-color', function(t) {
	t.plan(2);

	var pluginOpts = {
		baseUrl   : path.resolve(testRoot, './build'),
		spriteName: 'sprite.basic-color.png',
		spritePath: path.resolve(testRoot, './build'),
		verbose   : true
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
			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated, color extracted');
		});
});

tape('should create retina sprite and update references in stylesheet', function(t) {
	t.plan(3);

	var pluginOpts = {
		baseUrl   : path.resolve(testRoot, './build'),
		spriteName: 'sprite.retina.png',
		spritePath: path.resolve(testRoot, './build'),
		verbose   : true,
		retina    : true
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
			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.ok(path.resolve(pluginOpts.spritePath, 'sprite.retina.@2x.png'), 'sprite@2x created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should create external stylesheet and respect retina', function(t) {
	t.plan(4);

	var pluginOpts = {
		baseUrl      : path.resolve(testRoot, './build'),
		externalStyle: path.resolve(testRoot, './build/external.css'),
		spriteName   : 'sprite.retina.png',
		spritePath   : path.resolve(testRoot, './build'),
		verbose      : true,
		retina       : true
	};
	var processOpts = {
		from          : path.resolve(testRoot, './fixtures/style.retina.css'),
		to            : path.resolve(testRoot, './build/style.retina.css'),
		expect        : path.resolve(testRoot, './expectations/style.retina.css'),
		expectExternal: path.resolve(testRoot, './expectations/external.css'),
	};

	var processor           = postcss([plugin(pluginOpts)]);
	var css                 = fs.readFileSync(processOpts.from, { encoding: 'utf8' });
	var expectation         = fs.readFileSync(processOpts.expect, { encoding: 'utf8' });
	var expectationExternal = fs.readFileSync(processOpts.expectExternal, { encoding: 'utf8' });
	var outputExternal;

	processor
		.process(css, processOpts)
		.then(function(result) {
			outputExternal = fs.readFileSync(pluginOpts.externalStyle, { encoding: 'utf8' });

			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.ok(path.resolve(pluginOpts.spritePath, 'sprite.retina.@2x.png'), 'sprite@2x created');
			t.equal(result.css, expectation, 'stylesheet updated');
			t.equal(outputExternal, expectationExternal, 'external stylesheet created');
		});
});

tape('should filter and group images', function(t) {
	t.plan(3);

	var pluginOpts = {
		baseUrl   : path.resolve(testRoot, './build'),
		spriteName: 'sprite.fg.png',
		spritePath: path.resolve(testRoot, './build'),
		verbose   : true,
		groupBy   : function(image) {
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
			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.ok(path.resolve(pluginOpts.spritePath, 'sprite.fg.retina.png'), 'sprite@retina created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});

tape('should allow images different than PNG', function(t) {
	t.plan(2);

	var pluginOpts = {
		baseUrl   : path.resolve(testRoot, './build'),
		spriteName: 'sprite.jpeg.jpg',
		spritePath: path.resolve(testRoot, './build'),
		verbose   : false,
		padding   : 2
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
			t.ok(path.resolve(pluginOpts.spritePath, pluginOpts.spriteName), 'sprite created');
			t.equal(result.css, expectation, 'stylesheet updated');
		});
});
