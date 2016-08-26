# Output Dimensions

###### Input

```css
/* css/style.css */
.circle { background: url(images/circle.png) no-repeat 0 0; }
.square { background: url(images/square.png) no-repeat 0 0; }
```

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var updateRule = require('postcss-sprites/lib/core').updateRule;
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	hooks: {
		onUpdateRule: function(rule, token, image) {
			// Use built-in logic for background-image & background-position
			updateRule(rule, token, image);

			['width', 'height'].forEach(function(prop) {
				rule.insertAfter(rule.last, postcss.decl({
					prop: prop,
					value: image.coords[prop] + 'px'
				}));
			});
		}
	}
}
```

----

###### Output

```css
.circle { background-image: url(images/sprite.png); background-position: 0 0; width: 20px; height: 20px; }
.square { background-image: url(images/sprite.png); background-position: -20px 0; width: 20px; height: 20px; }
```
