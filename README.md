# PostCSS Sprites
[PostCSS](https://github.com/postcss/postcss) plugin that generate sprites from your stylesheets and then updates image references.

## Install

```
npm install postcss-sprites
```

## Example

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var opts    = {
	externalStyle: './dist/sprite.css',
	spritePath   : './dist/images',
	spriteName   : 'sprite.png',
	retina       : true
};

postcss(sprites(opts))
	.process(css, { from: './src/app.css', to: './dist/app.css' })
    .then(function (result) {
        fs.writeFileSync('./dist/app.css', result.css);
    });
```

#### Input
```css
.comment { background: #fff url(images/sprite/ico-comment.png) no-repeat 0 0; }
.bubble { background: url(images/sprite/ico-bubble.png) no-repeat 0 0; }

.arrows { background: url(images/sprite/arrows@2x.png) no-repeat 0 0; }
.logo { background: url(images/sprite/logo@2x.png) no-repeat 0 0; }
```

#### Output
```css
.comment { background-image: url(images/sprite.png); background-position: 0 0; background-color: #fff; }
.bubble { background-image: url(images/sprite.png); background-position: 0 -50px; }

.arrows { background-image: url(images/sprite.@2x.png); background-position: 0 0; background-size: 100px 100px; }
.logo { background-image: url(images/sprite.@2x.png); background-position: 0 -50px; background-size: 100px 100px; }
```

#### Output - external
```css
.comment,
.bubble { background-image: url(images/sprite.png); background: no-repeat; }

.comment { background-position: 0 0; width: 50px; height: 50px; }
.bubble { background-position: 0 -50px; width: 50px; height: 50px; }

@media (-webkit-min-device-pixel-ratio: 2), (min-resolution: 192dpi) {
	.arrows,
	.logo { background-image: url(images/sprite.@2x.png); background: no-repeat; background-size: 100px 100px; }

	.arrows { background-position: 0 0; width: 50px; height: 50px; }
	.logo { background-position: 0 -50px; width: 50px; height: 50px; }
}
```

## Options (plugin)

#### baseUrl

Type: `String`
Default: `./`
Example: `./dist`
Required: `true`

Define the root of your output folder. This option is used to generate the correct path to spritesheet.

#### spriteName

Type: `String`
Default: `sprite.png`
Example: `all.png`
Required: `true`

Defines the base of output sprite. Base means that if you will group your sprites by some criteria, name will change.

#### spritePath

Type: `String`
Default: `null`
Example: `./dist`
Required: `true`

Can define relative path of references in the output stylesheet.

#### externalStyle

Type: `String`
Default: `false`
Example: `./dist/sprite.css`
Required: `false`

Can define standalone CSS file that will be generated from the sprite.

#### filterBy

Type: `Function[], Function`
Default: `[]`
Example: [filterBy](#advanced-example)
Required: `false`

Defines which filters apply to images found in the stylesheet. Each filter will be called with an image object. Each filter must return `Boolean` or thenable `Promise`, that will be resolved with `Boolean`. Each filter applies in series.

Built in filters:

- based on `fs.exists`, which is used to remove non existing images.

#### groupBy

Type: `Function[], Function`
Default: `[]`
Example: [groupBy](#advanced-example)
Required: `false`

Defines logic of how to group images found in the stylesheet. Each grouper called with an image object. Each filter must return `String|Null` or thenable `Promise`, that will be resolved with `String|Null`. Each grouper applies in series.

Built in groupers:

- based on `@2x` image naming syntax, will produce `sprite.@{number}x.png` naming. (`@{number}x` image group).

#### retina

Type: `Boolean`
Default: `false`
Example: `true`
Required: `false`

Defines whether or not to search for retina mark in the filename. If true then it will look for `@{number}x` syntax. For example: `image@2x.png`.

#### verbose

Type: `Boolean`
Default: `false`
Example: `true`
Required: `false`

Suppress `console.log` messages.

## Options ([spritesmith](https://github.com/Ensighten/spritesmith))

All options for spritesmith are optional. For more detailed information you can visit
the official page of [spritesmith](https://github.com/Ensighten/spritesmith).

#### engine

Type: `String`
Default: `pixelsmith`

#### algorithm

Type: `String`
Default: `binary-tree`

#### padding

Type: `Number`
Default: `0`

#### engineOpts

Type: `Object`
Default: `{}`

#### exportOpts

Type: `Object`
Default: `{}`

## The Image

Every filter or grouper is called with an ``image`` object, which have following properties:

#### path

Type: `String`
Example: `/Users/john/project/image.png`

Resolved path to the image.

#### url

Type: `String`
Example: `images/image.png`

Url for image found in the stylesheet.

#### ratio

Type: `String`
Default: `1`

Ratio of the retina image - e.g. @2x => 2

#### retina

Type: `Boolean`
Default: `false`

The flag that indicates a retina image.

#### groups

Type: `Array`
Default: `[]`

The groups associated with the image after grouping functions.

#### token

Type: `Object`

The string used to update image reference in the stylesheet.
This token is [PostCSS Comment](https://github.com/postcss/postcss/blob/master/docs/api.md#comment-node).

#### selector

Type: `String`

The CSS selector used for this image in the external stylesheet.

## Advanced Example

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var Q       = require('q');
var opts    = {
	spritePath   : './dist/images',
	spriteName   : 'sprite.png',
	verbos       : true,
	filterBy     : function(image) {
		return /\.jpg$/gi.test(image.url);
	},
	groupBy      : function(image) {
		return Q.Promise(function(resolve) {
			// Do something here...

			resolve('groupName');
		});
	}
};

postcss(sprites(opts))
	.process(css, { from: './src/app.css', to: './dist/app.css' })
    .then(function (result) {
        fs.writeFileSync('./dist/app.css', result.css);
    });
```

## Contributing

Pull requests are welcome.

## License
MIT © 2createStudio
