import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs';
import { defaults, extractImages, prepareGroupBy, applyGroupBy, runSpritesmith } from '../lib/core';

const readFileAsync = Promise.promisify(fs.readFile);

test.beforeEach((t) => {
	t.context.opts = _.merge({ logger() {} }, defaults);
});

test('should generate spritesheets', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);

	t.truthy(spritesheets.length === 1);
	t.deepEqual(spritesheets[0].properties, { width: 50, height: 25 });
});

test('should generate SVG spritesheets', async (t) => {
	const cssContents = await readFileAsync('./fixtures/svg-basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/svg-basic/style.css' });
	let images, spritesheets, opts;

	prepareGroupBy(t.context.opts);
	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);

	t.truthy(spritesheets.length === 1);
	t.deepEqual(spritesheets[0].properties, { width: 962, height: 600 });
});

test('should generate spritesheets by groups', async (t) => {
	const cssContents = await readFileAsync('./fixtures/retina/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/retina/style.css' });
	let images, spritesheets, opts;

	t.context.opts.retina = true;

	prepareGroupBy(t.context.opts);
	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);

	t.truthy(spritesheets.length === 2);
	t.truthy(spritesheets[1].groups.indexOf('@2x') > -1);
});
