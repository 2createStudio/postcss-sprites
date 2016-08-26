import Spritesmith from 'spritesmith';
import Promise from 'bluebird';
import _ from 'lodash';

/**
 * Generate the spritesheet.
 * @param  {Object} opts
 * @param  {Array}  images
 * @return {Promise}
 */
export default function run(opts, images) {
	const config = _.defaultsDeep({}, {
		src: _.map(images, 'path')
	}, opts.spritesmith);

	// Increase padding to handle retina ratio
	if (areRetinaImages(images)) {
		const ratio = _.chain(images)
			.flatten('ratio')
			.uniq()
			.head()
			.value()
			.ratio;

		if (ratio) {
			config.padding = config.padding * ratio;
		}
	}

	return Promise.promisify(Spritesmith.run, { context: Spritesmith })(config)
		.then((spritesheet) => {
			spritesheet.extension = 'png';

			return spritesheet;
		});
}

/**
 * Checkes whether all images are retina.
 * @param  {Array} images
 * @return {Boolean}
 */
function areRetinaImages(images) {
	return _.every(images, image => image.retina);
}
