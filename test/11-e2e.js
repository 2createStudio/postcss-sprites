import test from 'ava';
import postcss from 'postcss';
import fs from 'fs-extra';
import Promise from 'bluebird';
import path from 'path';
import plugin from '../lib';

Promise.promisifyAll(fs);

async function run(inputPath, expectedPath, opts, t) {
	const input = await fs.readFileAsync(inputPath, 'utf8');
	const expected = await fs.readFileAsync(expectedPath, 'utf8');
	const processor = postcss([plugin(opts)]);
	const result = await processor.process(input, { from: inputPath });

	t.deepEqual(result.css, expected);
}

test('throws error', async (t) => {
	const inputPath = './fixtures/error/style.css';
	const opts = {
		stylesheetPath: './build/example-error/',
		spritePath: './build/example-error/',
	};

	const input = await fs.readFileAsync(inputPath, 'utf8');
	const processor = postcss([plugin(opts)]);

	t.throws(processor.process(input, { from: inputPath }));
});

test('basic', async (t) => {
	const inputPath = './fixtures/basic/style.css';
	const expectedPath = './expectations/basic/style.css';
	const opts = {
		stylesheetPath: './build/basic/',
		spritePath: './build/basic/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('basic SVG', async (t) => {
	const inputPath = './fixtures/svg-basic/style.css';
	const expectedPath = './expectations/svg-basic/style.css';
	const opts = {
		stylesheetPath: './build/svg-basic/',
		spritePath: './build/svg-basic/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('retina', async (t) => {
	const inputPath = './fixtures/retina/style.css';
	const expectedPath = './expectations/retina/style.css';
	const opts = {
		stylesheetPath: './build/retina/',
		spritePath: './build/retina/',
		retina: true
	};

	return run(inputPath, expectedPath, opts, t);
});

test('color', async (t) => {
	const inputPath = './fixtures/color/style.css';
	const expectedPath = './expectations/color/style.css';
	const opts = {
		stylesheetPath: './build/color/',
		spritePath: './build/color/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('absolute path', async (t) => {
	const inputPath = './fixtures/absolute/css/style.css';
	const expectedPath = './expectations/absolute/style.css';
	const opts = {
		basePath: './fixtures/absolute/',
		stylesheetPath: './build/absolute/',
		spritePath: './build/absolute/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('filter by', async (t) => {
	const inputPath = './fixtures/filter-by/style.css';
	const expectedPath = './expectations/filter-by/style.css';
	const opts = {
		stylesheetPath: './build/filter-by/',
		spritePath: './build/filter-by/',
		filterBy: (image) => {
			if (image.url.indexOf('square') === -1) {
				return Promise.reject();
			}

			return Promise.resolve();
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('group by', async (t) => {
	const inputPath = './fixtures/group-by/style.css';
	const expectedPath = './expectations/group-by/style.css';
	const opts = {
		stylesheetPath: './build/group-by/',
		spritePath: './build/group-by/',
		groupBy: (image) => {
			if (image.url.indexOf('square') === -1 && image.url.indexOf('circle') === -1) {
				return Promise.reject();
			}

			return Promise.resolve('shapes');
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('hooks', async (t) => {
	const inputPath = './fixtures/hooks/style.css';
	const expectedPath = './expectations/hooks/style.css';
	const opts = {
		stylesheetPath: './build/hooks/',
		spritePath: './build/hooks/',
		hooks: {
			onSaveSpritesheet: (opts, groups) => {
				return path.join(opts.spritePath, ['shapes', ...groups, 'png'].join('.'));
			},
			onUpdateRule: (rule, token, image) => {
				rule.insertAfter(token, postcss.decl({
					prop: 'background-image',
					value: `url(${image.spriteUrl})`
				}));
			}
		}
	};

	return run(inputPath, expectedPath, opts, t);
});
