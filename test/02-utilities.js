import test from 'ava';
import {
	hasImageInRule,
	getImageUrl,
	isImageSupported,
	isRetinaImage,
	getRetinaRatio,
	getColor,
	makeSpritesheetPath,
	isToken
} from '../lib';

test('should detect background images in CSS rules', (t) => {
	const background = '.selector-b { background: url(square.png) no-repeat 0 0; }';
	const backgroundImage = '.selector-a { background-image: url(circle.png); }';
	const backgroundBlock = `
		.selector-b {
			color: #fff;
			background: url(square.png) no-repeat 0 0
		}
	`;
	const backgroundColor = '.selector-a { background: #fff; }';

	t.truthy(hasImageInRule(background));
	t.truthy(hasImageInRule(backgroundImage));
	t.truthy(hasImageInRule(backgroundBlock));
	t.falsy(hasImageInRule(backgroundColor));
});

test('should return the url of an image', (t) => {
	const background = '.selector-b { background: url(square.png) no-repeat 0 0; }';
	const backgroundImage = '.selector-a { background-image: url(circle.png); }';
	const backgroundBlock = `
		.selector-b {
			color: #fff;
			background: url(square.png) no-repeat 0 0
		}
	`;
	const backgroundColor = '.selector-a { background: #fff; }';

	t.deepEqual(getImageUrl(background), 'square.png');
	t.deepEqual(getImageUrl(backgroundImage), 'circle.png');
	t.deepEqual(getImageUrl(backgroundBlock), 'square.png');
	t.deepEqual(getImageUrl(backgroundColor), '');
});

test('should remove get params', (t) => {
	const background = '.selector-b { background: url(square.png?v1234) no-repeat 0 0; }';
	t.deepEqual(getImageUrl(background), 'square.png');
});


test('should remove the quotes', (t) => {
	const background = '.selector-b { background: url("square.png") no-repeat 0 0; }';
	t.deepEqual(getImageUrl(background), 'square.png');
});

test('should allow only local files', (t) => {
	const local = 'sprite/test.png';
	const http = 'http://example.com/test.png';
	const base64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIA';

	t.truthy(isImageSupported(local));
	t.falsy(isImageSupported(http));
	t.falsy(isImageSupported(base64));
});

test('should detect retina images', (t) => {
	const retina = 'sprite/test@2x.png';
	const nonRetina = 'sprite/test.png';

	t.truthy(isRetinaImage(retina));
	t.falsy(isRetinaImage(nonRetina));
});

test('should extract the ratio of an image', (t) => {
	const nonRetina = 'sprite/test.png';
	const retina2x = 'sprite/test@2x.png';
	const retina3x = 'sprite/test@3x.png';

	t.deepEqual(getRetinaRatio(nonRetina), 1);
	t.deepEqual(getRetinaRatio(retina2x), 2);
	t.deepEqual(getRetinaRatio(retina3x), 3);
});

test('should extract color from declaration value', (t) => {
	const hexLong = '#000000 url(image.png)';
	const hexShort = '#000 url(image.png)';
	const rgb = 'rgb(255, 255, 255) url(image.png)';
	const rgba = 'rgb(255, 255, 255, .5) url(image.png)';
	const empty = 'url(image.png)';

	t.deepEqual(getColor(hexLong), '#000000');
	t.deepEqual(getColor(hexShort), '#000');
	t.deepEqual(getColor(rgb), 'rgb(255, 255, 255)');
	t.deepEqual(getColor(rgba), 'rgb(255, 255, 255, .5)');
	t.deepEqual(getColor(empty), null);
});

test('should generate spritesheet filename', (t) => {
	t.deepEqual(makeSpritesheetPath({ spritePath: './' }, [], 'png'), 'sprite.png');
	t.deepEqual(makeSpritesheetPath({ spritePath: './' }, ['@2x'], 'png'), 'sprite.@2x.png');
});

test('should detect comment tokens', (t) => {
	t.truthy(isToken('/* @replace|circle.png */'));
	t.falsy(isToken('/* circle.png */'));
});
