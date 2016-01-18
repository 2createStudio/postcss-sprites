# Responsive Spritesheets

###### Input

```css
/* css/style.css */
.circle { background: url(images/circle.png) no-repeat 0 0; }
.square { background: url(images/square.png) no-repeat 0 0; }
```

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts = {
	stylesheetPath: './css',
	spritePath: './css/images/',
	hooks: {
		onUpdateRule: function(rule, token, image) {
			var backgroundSizeX = (image.spriteWidth / image.coords.width) * 100;
			var backgroundSizeY = (image.spriteHeight / image.coords.height) * 100;
			var backgroundPositionX = (image.coords.x / (image.spriteWidth - image.coords.width)) * 100;
			var backgroundPositionY = (image.coords.y / (image.spriteHeight - image.coords.height)) * 100;

			backgroundSizeX = isNaN(backgroundSizeX) ? 0 : backgroundSizeX;
			backgroundSizeY = isNaN(backgroundSizeY) ? 0 : backgroundSizeY;
			backgroundPositionX = isNaN(backgroundPositionX) ? 0 : backgroundPositionX;
			backgroundPositionY = isNaN(backgroundPositionY) ? 0 : backgroundPositionY;

			var backgroundImage = postcss.decl({
				prop: 'background-image',
				value: 'url(' + image.spriteUrl + ')'
			});

			var backgroundSize = postcss.decl({
				prop: 'background-size',
				value: backgroundSizeX + '% ' + backgroundSizeY + '%'
			});

			var backgroundPosition = postcss.decl({
				prop: 'background-position',
				value: backgroundPositionX + '% ' + backgroundPositionY + '%'
			});

			rule.insertAfter(token, backgroundImage);
			rule.insertAfter(backgroundImage, backgroundPosition);
			rule.insertAfter(backgroundPosition, backgroundSize);
		}
	}
}
```

----

###### Output

```css
.circle { background-image: url(sprite.png); background-position: 0% 0%; background-size: 200% 100%; }
.square { background-image: url(sprite.png); background-position: 100% 0%; background-size: 200% 100%; }
```
