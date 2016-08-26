var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var SVGSpriter = require('svg-sprite');
var Promise = require('bluebird');

module.exports = function ( opts ) {

	var spriter = new SVGSpriter(_.merge({}, {
		mode: {
			css: {
				render: {
					css: {
						template: path.resolve(__dirname, 'json.html')
					}
				},
				dimensions: true,
				bust: false
			}
		},
		shape: {
			id: {
				generator: function ( name, file ) {
					return file.path;
				}
			}
		},
		svg: {
			precision: 5
		},
		variables: {
			abs: function () {
				return function ( num, render ) {
					return Math.abs(render(num));
				}
			}
		}
	}, opts.svgSpriteConfig));

	opts.src.forEach(function ( file ) {
		spriter.add(path.resolve(file), path.basename(file), fs.readFileSync(path.resolve(file), { encoding: 'utf-8' }));
	});

	return Promise.promisify(spriter.compile, { context: spriter })()
		.then(function ( res ) {
			return _.extend({}, JSON.parse(res.css.css.contents), {
				image: res.css.sprite.contents
			});
		});

};
