import test from 'ava';
import postcss from 'postcss';
import _ from 'lodash';
import { defaults, extractImages, setTokens } from '../lib/core';

async function run(input) {
	let root = postcss.parse(input, { from: '/tmp/test.css' });
	let opts = _.merge({ logger() {} }, defaults);
	let images;

	[ opts, images ] = await extractImages(root, opts);
	[ root, opts, images ] = await setTokens(root, opts, images);

	return root;
}

test('should replace background declarations with comment tokens', async (t) => {
	const input = `
		.selector-a { background-image: url(circle.png); }
		.selector-b { background: url(square.png) no-repeat 0 0; }
	`;
	const expected = `
		.selector-a { /* @replace|circle.png */ }
		.selector-b { /* @replace|square.png */ }
	`;
	const root = await run(input);

	t.deepEqual(root.toString(), expected);
});

test('should remove any background-repeat, background-size or background-position declarations', async (t) => {
	const input = `
		.selector-a { background-image: url(circle.png); background-repeat: no-repeat; background-position: center center; }
		.selector-b { background: url(square.png) no-repeat 0 0; background-size: 100% 100%; }
	`;
	const expected = `
		.selector-a { /* @replace|circle.png */ }
		.selector-b { /* @replace|square.png */ }
	`;
	const root = await run(input);

	t.deepEqual(root.toString(), expected);
});
