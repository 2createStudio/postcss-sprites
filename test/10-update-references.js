import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
import Promise from 'bluebird';
import fs from 'fs-extra';
import {
	defaults,
	extractImages,
	setTokens,
	runSpritesmith,
	saveSpritesheets,
	mapSpritesheetProps,
	updateReferences,
	updateRule
} from '../lib/core';

const readFileAsync = Promise.promisify(fs.readFile);

test.beforeEach((t) => {
	t.context.opts = _.merge({}, defaults);
});

test('should update CSS declarations', async (t) => {
	const input = await readFileAsync('./fixtures/basic/style.css');
	const expected = await readFileAsync('./expectations/basic/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './build/basic';
	t.context.opts.stylesheetPath = './build/basic';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ root, opts, images ] = await setTokens(ast, t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);
	[ root, opts, images, spritesheets ] = await updateReferences(root, t.context.opts, images, spritesheets);

	t.deepEqual(root.toString(), expected);
});

test('should update CSS declarations with relative paths', async (t) => {
	const input = await readFileAsync('./fixtures/relative/style.css');
	const expected = await readFileAsync('./expectations/relative/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './fixtures/relative/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './build/relative';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ root, opts, images ] = await setTokens(ast, t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);
	[ root, opts, images, spritesheets ] = await updateReferences(root, t.context.opts, images, spritesheets);

	t.deepEqual(root.toString(), expected);
});

test('should use function provided by onUpdateRule hook', async (t) => {
	const input = await readFileAsync('./fixtures/basic/style.css');
	const expected = await readFileAsync('./expectations/basic-on-update-rule-hook/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './fixtures/basic/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './build/basic-on-update-rule-hook';
	t.context.opts.stylesheetPath = './build/basic-on-update-rule-hook';
	t.context.opts.hooks.onUpdateRule = (rule, commentNode, image) => {
		const backgroundColorDecl = postcss.decl({
			prop: 'background-color',
			value: '#000'
		});

		updateRule(rule, commentNode, image);

		rule.insertAfter(rule.last, backgroundColorDecl);
	}

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ root, opts, images ] = await setTokens(ast, t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);
	[ root, opts, images, spritesheets ] = await updateReferences(root, t.context.opts, images, spritesheets);

	t.deepEqual(root.toString(), expected);
});
