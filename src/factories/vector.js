import fs from 'fs';
import SVGSpriter from 'svg-sprite';
import Promise from 'bluebird';
import _ from 'lodash';

/**
 * Generate the spritesheet.
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
export default function run(opts, images) {
	const config  = _.defaultsDeep({}, opts.svgsprite);
	const spriter = new SVGSpriter(config);

	images.forEach(({ path }) => {
		spriter.add(path, null, fs.readFileSync(path, { encoding: 'utf-8' }));
	});

	return Promise.promisify(spriter.compile, {
		context: spriter,
		multiArgs: true
	})().spread((result, data) => {
		const spritesheet = {};

		spritesheet.extension = 'svg';
		spritesheet.coordinates = {};
		spritesheet.image = result.css.sprite.contents;
		spritesheet.properties = {
			width: data.css.spriteWidth,
			height: data.css.spriteHeight
		};


		data.css.shapes.forEach((shape) => {
			spritesheet.coordinates[new Buffer(shape.name, 'base64').toString()] = {
				width: shape.width.outer,
				height: shape.height.outer,
				x: shape.position.absolute.x,
				y: shape.position.absolute.y
			};
		});

		return spritesheet;
	});
}
