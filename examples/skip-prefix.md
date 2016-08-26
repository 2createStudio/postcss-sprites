# Skip Prefix

###### Input

```css
/* css/style.css */
.circle { background: url(images/circle.png) no-repeat 0 0; }
.square { background: url(images/square.png) no-repeat 0 0; }
```

```javascript
var path = require('path');
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	hooks: {
		onSaveSpritesheet: function(opts, spritesheet) {
			// We assume that the groups is not an empty array
			var filenameChunks = spritesheet.groups.slice().push('png');
			return path.join(opts.spritePath, filenameChunks.join('.'));
		}
	}
}
```

----

###### Output

```css
.circle { background-image: url(images/shapes.png); background-position: 0 0; }
.square { background-image: url(images/shapes.png); background-position: -20px 0; }
```
