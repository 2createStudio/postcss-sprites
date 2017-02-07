import test from 'ava';
import postcss from 'postcss';
import Promise from 'bluebird';
import _ from 'lodash';
import { defaults, prepareFilterBy, extractImages, applyFilterBy } from '../lib/core';

test.beforeEach(async (t) => {
	t.context.opts = _.merge({ logger() {} }, defaults);

	const input = `
		.selector-a { background-image: url(circle.png); }
		.selector-b { background: url(square.png) no-repeat 0 0; }
	`;
	const ast = postcss.parse(input, { from: '/tmp/test.css' });
	const [ opts, images ] = await extractImages(ast, t.context.opts);

	t.context.images = images;
	t.context.ast = ast;
});

test('should use built-in filter for non existing files', async (t) => {
	prepareFilterBy(t.context.opts);

	const [ opts, images ] = await applyFilterBy(t.context.opts, t.context.images);

	t.truthy(images.length === 0);
});

test('should use filters provided by user', async (t) => {
	t.context.opts.filterBy.push((image) => {
		if (image.url.indexOf('png') === -1) {
			return Promise.reject();
		}

		return Promise.resolve();
	});

	t.context.opts.filterBy.push((image) => {
		if (image.url.indexOf('circle') > -1) {
			return Promise.reject();
		}

		return Promise.resolve();
	});

	const [ opts, images ] = await applyFilterBy(t.context.opts, t.context.images);

	t.truthy(images.length === 1);
	t.truthy(images[0].url.indexOf('square') > -1);
});

test('should use filters by filename provided by user', async (t) => {
	t.context.opts.filterBy.push((image) => {
		if (image.styleFilePath.indexOf('test.css') !== -1) {
			return Promise.reject();
		}

		return Promise.resolve();
	});

	const [ opts, images ] = await applyFilterBy(t.context.opts, t.context.images);

	t.truthy(images.length === 0);
});
