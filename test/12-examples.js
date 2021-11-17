import test from 'ava';
import postcss from 'postcss';
import fs from 'fs-extra';
import path from 'path';
import plugin from '../lib';
import { updateRule } from '../lib/core';

async function run(inputPath, expectedPath, opts, t) {
	const input = await fs.readFile(inputPath, 'utf8');
	const expected = await fs.readFile(expectedPath, 'utf8');
	const processor = postcss([plugin(opts)]);
	const result = await processor.process(input, { from: inputPath });

	t.deepEqual(result.css, expected);
}

test('filter by', async (t) => {
	const inputPath = './test/fixtures/example-filter-by/style.css';
	const expectedPath = './test/expectations/example-filter-by/style.css';
	const opts = {
		stylesheetPath: './test/build/example-filter-by/',
		spritePath: './test/build/example-filter-by/',
		filterBy: (image) => {
			if (!/\.png$/.test(image.url)) {
				return Promise.reject();
			}

			return Promise.resolve();
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('group by', async (t) => {
	const inputPath = './test/fixtures/example-group-by/style.css';
	const expectedPath = './test/expectations/example-group-by/style.css';
	const opts = {
		stylesheetPath: './test/build/example-group-by/',
		spritePath: './test/build/example-group-by/',
		groupBy: (image) => {
			if (image.url.indexOf('shapes') === -1) {
				return Promise.reject();
			}

			return Promise.resolve('shapes');
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('output dimensions', async (t) => {
	const inputPath = './test/fixtures/example-output-dimensions/style.css';
	const expectedPath = './test/expectations/example-output-dimensions/style.css';
	const opts = {
		stylesheetPath: './test/build/example-output-dimensions/',
		spritePath: './test/build/example-output-dimensions/',
		hooks: {
			onUpdateRule: (rule, token, image) => {
				updateRule(rule, token, image);

				['width', 'height'].forEach((prop) => {
					rule.insertAfter(rule.last, postcss.decl({
						prop,
						value: `${image.coords[prop]}px`
					}));
				});
			}
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('responsive spritesheets', async (t) => {
	const inputPath = './test/fixtures/example-responsive-spritesheets/style.css';
	const expectedPath = './test/expectations/example-responsive-spritesheets/style.css';
	const opts = {
		stylesheetPath: './test/build/example-responsive-spritesheets/',
		spritePath: './test/build/example-responsive-spritesheets/',
		hooks: {
			onUpdateRule: (rule, token, image) => {
				let backgroundSizeX = (image.spriteWidth / image.coords.width) * 100;
	            let backgroundSizeY = (image.spriteHeight / image.coords.height) * 100;
	            let backgroundPositionX = (image.coords.x / (image.spriteWidth - image.coords.width)) * 100;
	            let backgroundPositionY = (image.coords.y / (image.spriteHeight - image.coords.height)) * 100;

	            backgroundSizeX = isNaN(backgroundSizeX) ? 0 : backgroundSizeX;
	            backgroundSizeY = isNaN(backgroundSizeY) ? 0 : backgroundSizeY;
	            backgroundPositionX = isNaN(backgroundPositionX) ? 0 : backgroundPositionX;
	            backgroundPositionY = isNaN(backgroundPositionY) ? 0 : backgroundPositionY;

	            const backgroundImage = postcss.decl({
	                prop: 'background-image',
	                value: 'url(' + image.spriteUrl + ')'
	            });

	            const backgroundSize = postcss.decl({
	                prop: 'background-size',
	                value: backgroundSizeX + '% ' + backgroundSizeY + '%'
	            });

	            const backgroundPosition = postcss.decl({
	                prop: 'background-position',
	                value: backgroundPositionX + '% ' + backgroundPositionY + '%'
	            });

	            rule.insertAfter(token, backgroundImage);
	            rule.insertAfter(backgroundImage, backgroundPosition);
	            rule.insertAfter(backgroundPosition, backgroundSize);
			}
		}
	};

	return run(inputPath, expectedPath, opts, t);
});

test('skip prefix', async (t) => {
	const inputPath = './test/fixtures/example-skip-prefix/style.css';
	const expectedPath = './test/expectations/example-skip-prefix/style.css';
	const opts = {
		stylesheetPath: './test/build/example-skip-prefix/',
		spritePath: './test/build/example-skip-prefix/',
		hooks: {
			onSaveSpritesheet: (opts, groups) => {
	            return path.join(opts.spritePath, 'shapes.png');
	        }
		}
	};

	return run(inputPath, expectedPath, opts, t);
});
