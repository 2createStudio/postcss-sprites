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
	// build sprite with only `.png` images
	filterBy: ({ path: imagePath }) => (/\.png$/).test(imagePath)
}
```

----

###### Output

```css
.header { background: url(images/header.jpg) no-repeat 0 0; }
.logo { background-image: url(images/sprite.png); background-position: 0 0; }
```
