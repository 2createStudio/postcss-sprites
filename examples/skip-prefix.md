# Skip Prefix

There [used to be a `skipPrefix` plugin option](https://github.com/2createStudio/postcss-sprites/blob/b525125d9bae2911335cb27d0263558eee9f7723/README.md#skipprefix) that allowed you to skips the prefix in the name of output spritesheet (e.g., `sprite.customGroup.png => customGroup.png`). This allows you to do the same thing.

###### Input

```css
/* css/style.css */
.circle { background: url(images/circle.png) no-repeat 0 0; }
.square { background: url(images/square.png) no-repeat 0 0; }
```

```js
var path = require('path');
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	hooks: {
		onSaveSpritesheet: function(opts, spritesheet) {
			// We assume that the groups is not an empty array
			var filenameChunks = spritesheet.groups.concat(spritesheet.extension);
			return path.join(opts.spritePath, filenameChunks.join('.'));
		}
	}
};
```

----

###### Output

```css
.circle { background-image: url(images/shapes.png); background-position: 0 0; }
.square { background-image: url(images/shapes.png); background-position: -20px 0; }
```
