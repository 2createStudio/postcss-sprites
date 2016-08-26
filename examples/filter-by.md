# Filter By

###### Input

```css
/* css/style.css */
.header { background: url(images/header.jpg) no-repeat 0 0; }
.logo { background: url(images/logo.png) no-repeat 0 0; }
```

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	filterBy: function(image) {
		// Allow only png files
		if (!/\.png$/.test(image.url)) {
			return Promise.reject();
		}

		return Promise.resolve();
	}
}
```

----

###### Output

```css
.header { background: url(images/header.jpg) no-repeat 0 0; }
.logo { background-image: url(images/sprite.png); background-position: 0 0; }
```
