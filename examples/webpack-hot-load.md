# Webpack Hot Load

If you want to hot load image assets as they are introduced or edited, you can configure your postcss loader to add a hash to each sprite sheet as it is saved.

* [webpack loader context: `addDependency`](https://webpack.github.io/docs/loaders.html#adddependency)
* [`rev-hash`](https://www.npmjs.com/package/rev-hash)

###### Input

```js
var path = require('path');
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var revHash = require('rev-hash');

module.exports = function loadPostcssPlugins() {
	return [
		sprites({
			stylesheetPath: './css',
			spritePath: './css/images/',
			hooks: {
				onUpdateRule: function(rule, token, image) {
					// `this` is the webpack loader context
					this.addDependency(image.path); // adds a watch to the file
				},
				onSaveSpritesheet: function(opts, spritesheet) {
					return join(
						opts.spritePath,
						spritesheet.groups.concat([
							revHash(spritesheet.image),
							spritesheet.extension
						]).join('.')
					);
				}
			}
		})
	];
};
```
