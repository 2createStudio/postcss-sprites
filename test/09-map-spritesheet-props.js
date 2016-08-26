import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs-extra';
import {
	defaults,
	extractImages,
	runSpritesmith,
	saveSpritesheets,
	mapSpritesheetProps,
	prepareGroupBy,
	applyGroupBy
} from '../lib';

const readFileAsync = Promise.promisify(fs.readFile);

test.beforeEach((t) => {
	t.context.opts = _.merge({}, defaults);
});

test('should add coords & spritePath to every image', async (t) => {
	const cssContents = await readFileAsync('./fixtures/basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/basic';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);

	t.deepEqual(images[0].spritePath, 'build/basic/sprite.png');
	t.deepEqual(images[0].coords, { x: 0, y: 0, height: 25, width: 25 });
});

test('should add coords & spritePath to every SVG image', async (t) => {
	const cssContents = await readFileAsync('./fixtures/svg-basic/style.css');
	const ast = postcss.parse(cssContents, { from: './fixtures/svg-basic/style.css' });
	let images, spritesheets, opts;

	t.context.opts.spritePath = './build/svg-basic';

	prepareGroupBy(t.context.opts);
	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);

	t.deepEqual(images[0].spritePath, 'build/svg-basic/sprite.svg');
	t.deepEqual(images[0].coords, { x: 0, y: 0, height: 600, width: 600 });
});
