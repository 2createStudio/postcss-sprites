import test from 'ava';
import postcss from 'postcss';
import fs from 'fs-extra';
import Promise from 'bluebird';
import path from 'path';
import plugin from '../lib';
import { updateRule } from '../lib';

Promise.promisifyAll(fs);

async function run(inputPath, expectedPath, opts, t) {
	const input = await fs.readFileAsync(inputPath, 'utf8');
	const expected = await fs.readFileAsync(expectedPath, 'utf8');
	const processor = postcss([plugin(opts)]);
	const result = await processor.process(input, { from: inputPath });

	t.same(result.css, expected);
}

test('filter by', async (t) => {
	const inputPath = './fixtures/example-filter-by/style.css';
	const expectedPath = './expectations/example-filter-by/style.css';
	const opts = {
		stylesheetPath: './build/example-filter-by/',
		spritePath: './build/example-filter-by/',
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
	const inputPath = './fixtures/example-group-by/style.css';
	const expectedPath = './expectations/example-group-by/style.css';
	const opts = {
		stylesheetPath: './build/example-group-by/',
		spritePath: './build/example-group-by/',
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
	const inputPath = './fixtures/example-output-dimensions/style.css';
	const expectedPath = './expectations/example-output-dimensions/style.css';
	const opts = {
		stylesheetPath: './build/example-output-dimensions/',
		spritePath: './build/example-output-dimensions/',
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
	const inputPath = './fixtures/example-responsive-spritesheets/style.css';
	const expectedPath = './expectations/example-responsive-spritesheets/style.css';
	const opts = {
		stylesheetPath: './build/example-responsive-spritesheets/',
		spritePath: './build/example-responsive-spritesheets/',
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
	const inputPath = './fixtures/example-skip-prefix/style.css';
	const expectedPath = './expectations/example-skip-prefix/style.css';
	const opts = {
		stylesheetPath: './build/example-skip-prefix/',
		spritePath: './build/example-skip-prefix/',
		hooks: {
			onSaveSpritesheet: (opts, groups) => {
	            return path.join(opts.spritePath, 'shapes.png');
	        }
		}
	};

	return run(inputPath, expectedPath, opts, t);
});
