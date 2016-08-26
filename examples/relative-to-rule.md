# Relative To Rule

###### Input

```css
/* css/modules/shapes.css */
.circle { background: url(images/shapes/circle.png) no-repeat 0 0; }
.square { background: url(images/shapes/square.png) no-repeat 0 0; }

/* ..... */

/* css/style.css */
@import 'modules/shapes.css';

```

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	relativeTo: 'rule' // Everything will be relative to css/style.css instead of css/module/shapes.css
}
```

----

###### Output

```css
.circle { background-image: url(images/sprite.png); background-position: 0 0; }
.square { background-image: url(images/sprite.png); background-position: -20px 0; }
```
