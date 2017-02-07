import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs-extra';
import path from 'path';
import {
	defaults,
	extractImages,
	prepareGroupBy,
	applyGroupBy,
	runSpritesmith,
	saveSpritesheets
} from '../lib/core';

const readFileAsync = Promise.promisify(fs.readFile);

test.beforeEach((t) => {
	t.context.opts = _.merge({ logger() {} }, defaults);
});

test('should save spritesheets', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/basic';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);

	t.deepEqual(spritesheets[0].path, 'build/basic/sprite.png');
	t.truthy(fs.statAsync('./build/basic/sprite.png'));
});

test('should save SVG spritesheets', async (t) => {
	const cssContents = await readFileAsync('./fixtures/svg-basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/svg-basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/svg-basic';

	prepareGroupBy(t.context.opts);
	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);

	t.deepEqual(spritesheets[0].path, 'build/svg-basic/sprite.svg');
	t.truthy(fs.statAsync('./build/svg-basic/sprite.svg'));
});

test('should save spritesheets by groups', async (t) => {
	const cssContents = await readFileAsync('./fixtures/retina/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/retina/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/retina';
	t.context.opts.retina = true;

	prepareGroupBy(t.context.opts);

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);

	t.deepEqual(spritesheets[0].path, 'build/retina/sprite.png');
	t.deepEqual(spritesheets[1].path, 'build/retina/sprite.@2x.png');
	t.truthy(fs.statAsync('./build/retina/sprite.png'));
	t.truthy(fs.statAsync('./build/retina/sprite.@2x.png'));
});

test('should use path provided by book', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/on-save-hook/';
	t.context.opts.hooks.onSaveSpritesheet = (pluginOpts, spritesheetGroups) => {
		return path.join(pluginOpts.spritePath, 'custom-name.png');
	}

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);

	t.deepEqual(spritesheets[0].path, 'build/on-save-hook/custom-name.png');
	t.truthy(fs.statAsync('./build/on-save-hook/custom-name.png'));
});

test('should throw error if path is empty', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/on-save-hook/';
	t.context.opts.hooks.onSaveSpritesheet = (pluginOpts, spritesheetGroups) => {
		return '';
	}

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);

	t.throws(saveSpritesheets(t.context.opts, images, spritesheets));
});

test('should use Promise result provided by book', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/on-save-hook/';
	t.context.opts.hooks.onSaveSpritesheet = (pluginOpts, spritesheetGroups) => {
		return new Promise(( resolve ) => setTimeout(() => resolve(Promise.resolve(path.join(pluginOpts.spritePath, 'custom-name.png'))), 0));
	}

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);

	t.deepEqual(spritesheets[0].path, 'build/on-save-hook/custom-name.png');
	t.truthy(fs.statAsync('./build/on-save-hook/custom-name.png'));
});
