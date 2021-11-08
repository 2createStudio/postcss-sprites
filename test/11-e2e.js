import test from 'ava';
import postcss from 'postcss';
import fs from 'fs-extra';
import Promise from 'bluebird';
import path from 'path';
import plugin from '../lib';

const readFileAsync = Promise.promisify(fs.readFile);

async function run(inputPath, expectedPath, opts, t) {
	const input = await readFileAsync(inputPath, 'utf8');
	const expected = await readFileAsync(expectedPath, 'utf8');
	const processor = postcss([plugin(opts)]);
	const result = await processor.process(input, { from: inputPath });

	t.deepEqual(result.css, expected);
}

test('throws error', async (t) => {
	const inputPath = './test/fixtures/error/style.css';
	const opts = {
		stylesheetPath: './test/build/example-error/',
		spritePath: './test/build/example-error/',
	};

	const input = await readFileAsync(inputPath, 'utf8');
	const processor = postcss([plugin(opts)]);

	return t.throwsAsync(() => processor.process(input, { from: inputPath }));
});

test('basic', async (t) => {
	const inputPath = './test/fixtures/basic/style.css';
	const expectedPath = './test/expectations/basic/style.css';
	const opts = {
		stylesheetPath: './test/build/basic/',
		spritePath: './test/build/basic/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('basic SVG', async (t) => {
	const inputPath = './test/fixtures/svg-basic/style.css';
	const expectedPath = './test/expectations/svg-basic/style.css';
	const opts = {
		stylesheetPath: './test/build/svg-basic/',
		spritePath: './test/build/svg-basic/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('retina', async (t) => {
	const inputPath = './test/fixtures/retina/style.css';
	const expectedPath = './test/expectations/retina/style.css';
	const opts = {
		stylesheetPath: './test/build/retina/',
		spritePath: './test/build/retina/',
		retina: true
	};

	return run(inputPath, expectedPath, opts, t);
});

test('color', async (t) => {
	const inputPath = './test/fixtures/color/style.css';
	const expectedPath = './test/expectations/color/style.css';
	const opts = {
		stylesheetPath: './test/build/color/',
		spritePath: './test/build/color/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('absolute path', async (t) => {
	const inputPath = './test/fixtures/absolute/css/style.css';
	const expectedPath = './test/expectations/absolute/style.css';
	const opts = {
		basePath: './test/fixtures/absolute/',
		stylesheetPath: './test/build/absolute/',
		spritePath: './test/build/absolute/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('relative path', async (t) => {
	const inputPath = './test/fixtures/relative/style.css';
	const expectedPath = './test/expectations/relative/style.css';
	const opts = {
		spritePath: './test/build/relative/'
	};

	return run(inputPath, expectedPath, opts, t);
});

test('filter by', async (t) => {
	const inputPath = './test/fixtures/filter-by/style.css';
	const expectedPath = './test/expectations/filter-by/style.css';
	const opts = {
		stylesheetPath: './test/build/filter-by/',
		spritePath: './test/build/filter-by/',
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
	const inputPath = './test/fixtures/group-by/style.css';
	const expectedPath = './test/expectations/group-by/style.css';
	const opts = {
		stylesheetPath: './test/build/group-by/',
		spritePath: './test/build/group-by/',
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
	const inputPath = './test/fixtures/hooks/style.css';
	const expectedPath = './test/expectations/hooks/style.css';
	const opts = {
		stylesheetPath: './test/build/hooks/',
		spritePath: './test/build/hooks/',
		hooks: {
			onSaveSpritesheet: (opts, spritesheet) => {
				return path.join(opts.spritePath, ['shapes', ...spritesheet.groups, 'png'].join('.'));
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
