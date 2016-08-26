import test from 'ava';
import postcss from 'postcss';
import Promise from 'bluebird';
import _ from 'lodash';
import { defaults, prepareGroupBy, extractImages, applyGroupBy } from '../lib/core';

test.beforeEach((t) => {
	const input = `
		.selector-a { background-image: url(circle@2x.png); }
		.selector-b { background: url(square@2x.png) no-repeat 0 0; }
	`;

	t.context.opts = _.merge({}, defaults);
	t.context.ast = postcss.parse(input, { from: '/tmp/test.css' });
});

test('should use built-in retina grouping function', async (t) => {
	let images, opts;

	t.context.opts.retina = true;

	prepareGroupBy(t.context.opts);
	[ opts, images ] = await extractImages(t.context.ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);

	t.truthy(images.length === 2);
	t.truthy(images[0].groups.indexOf('@2x') > -1);
	t.truthy(images[1].groups.indexOf('@2x') > -1);
});

test('should use grouping functions provided by user', async (t) => {
	let images, opts;

	t.context.opts.retina = true;
	t.context.opts.groupBy.push((image) => {
		if (image.url.indexOf('png') === -1) {
			return Promise.reject();
		}

		return Promise.resolve('png');
	});

	prepareGroupBy(t.context.opts);

	[ opts, images ] = await extractImages(t.context.ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);

	t.truthy(images[0].groups.indexOf('png') > -1);
	t.truthy(images[0].groups.indexOf('@2x') > -1);
});

test('should use grouping functions by filename provided by user', async (t) => {
	let images, opts;

	t.context.opts.retina = true;
	t.context.opts.groupBy.push((image) => {
		if (image.styleFilePath.indexOf('test.css') !== -1) {
			return Promise.resolve('testing');
		}

		return Promise.reject();
	});

	prepareGroupBy(t.context.opts);

	[ opts, images ] = await extractImages(t.context.ast, t.context.opts);
	[ opts, images ] = await applyGroupBy(t.context.opts, images);

	t.truthy(images[0].groups.indexOf('testing') > -1);
});
