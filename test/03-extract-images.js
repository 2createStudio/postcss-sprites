import test from 'ava';
import postcss from 'postcss';
import { extractImages, defaults } from '../lib';

test.beforeEach((t) => {
	const input = `
		.selector-a { background-image: url(circle.png); }
		.selector-b { background: url(square.png) no-repeat 0 0; }
		.selector-c { background: url(square@2x.png) no-repeat 0 0; }
		.selector-d { background: url(/circle.png) no-repeat 0 0; }
	`;

	t.context.ast = postcss.parse(input, { from: '/tmp/test.css' });
	t.context.opts = Object.assign({}, defaults);
});

test('should convert rules to image objects', async (t) => {
	const [ opts, images ] = await extractImages(t.context.ast, t.context.opts);

	t.deepEqual(images.length, 4);
});

test('should handle retina images', async (t) => {
	t.context.opts.retina = true;

	const [ opts, images ] = await extractImages(t.context.ast, t.context.opts);

	t.deepEqual(images[2].ratio, 2);
});

test('should handle images with absolute url', async (t) => {
	t.context.opts.basePath = './images';

	const [ opts, images ] = await extractImages(t.context.ast, t.context.opts);

	t.truthy(images[3].path.indexOf('images') > -1);
});
