import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
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

test.beforeEach((t) => {
	t.context.opts = _.merge({ logger() {} }, defaults);
});

test('should update CSS declarations', async (t) => {
	const input = await fs.readFile('./test/fixtures/basic/style.css');
	const expected = await fs.readFile('./test/expectations/basic/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './test/fixtures/basic/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './test/build/basic';
	t.context.opts.stylesheetPath = './test/build/basic';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ root, opts, images ] = await setTokens(ast, t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);
	[ root, opts, images, spritesheets ] = await updateReferences(root, t.context.opts, images, spritesheets);

	t.deepEqual(root.toString(), expected);
});

test('should update CSS declarations with relative paths', async (t) => {
	const input = await fs.readFile('./test/fixtures/relative/style.css');
	const expected = await fs.readFile('./test/expectations/relative/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './test/fixtures/relative/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './test/build/relative';

	[ opts, images ] = await extractImages(ast, t.context.opts);
	[ root, opts, images ] = await setTokens(ast, t.context.opts, images);
	[ opts, images, spritesheets ] = await runSpritesmith(t.context.opts, images);
	[ opts, images, spritesheets ] = await saveSpritesheets(t.context.opts, images, spritesheets);
	[ opts, images, spritesheets ] = await mapSpritesheetProps(t.context.opts, images, spritesheets);
	[ root, opts, images, spritesheets ] = await updateReferences(root, t.context.opts, images, spritesheets);

	t.deepEqual(root.toString(), expected);
});

test('should use function provided by onUpdateRule hook', async (t) => {
	const input = await fs.readFile('./test/fixtures/basic/style.css');
	const expected = await fs.readFile('./test/expectations/basic-on-update-rule-hook/style.css', 'utf8');
	const ast = postcss.parse(input, { from: './test/fixtures/basic/style.css' });
	let images, spritesheets, opts, root;

	t.context.opts.spritePath = './test/build/basic-on-update-rule-hook';
	t.context.opts.stylesheetPath = './test/build/basic-on-update-rule-hook';
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
