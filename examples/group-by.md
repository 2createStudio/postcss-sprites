# Group By

###### Input

```css
/* css/style.css */
.circle { background: url(images/shapes/circle.png) no-repeat 0 0; }
.square { background: url(images/shapes/square.png) no-repeat 0 0; }

.logo { background: url(images/logo.png) no-repeat 0 0; }
```

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	groupBy: function(image) {
		if (image.url.indexOf('shapes') === -1) {
			return Promise.reject(new Error('Not a shape image.'));
		}

		return Promise.resolve('shapes');
	}
}
```

----

###### Output

```css
.circle { background-image: url(images/sprite.shapes.png); background-position: 0 0; }
.square { background-image: url(images/sprite.shapes.png); background-position: -20px 0; }

.logo { background-image: url(images/sprite.png); background-position: 0 0; }
```
