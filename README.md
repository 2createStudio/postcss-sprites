# PostCSS Sprites [![Build Status](https://travis-ci.org/2createStudio/postcss-sprites.svg?branch=master)](https://travis-ci.org/2createStudio/postcss-sprites) [![npm version](https://badge.fury.io/js/postcss-sprites.svg)](http://badge.fury.io/js/postcss-sprites)
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
	stylesheetPath: './dist',
	spritePath    : './dist/images/sprite.png',
	retina        : true
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
## Options (plugin)

#### stylesheetPath

Type: `String`
Default: `./`
Example: `./dist/css`
Required: `true`

Defines relative path to output stylesheet. This is used to generate correct relative path to spritesheet for CSS rules.

#### spritePath

Type: `String`
Default: `./sprite.png`
Example: `./dist/images/sprite.png`
Required: `true`

Can define relative path to ouput sprite.

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

#### outputDimensions

Type: `Boolean`
Default: `false`
Example: `true`
Required: `false`

Outputs `width` and `height` declarations.

#### skipPrefix

Type: `Boolean`
Default: `false`
Example: `true`
Required: `false`

Skips the prefix in the name of output spritesheet. e.g. `sprite.customGroup.png => customGroup.png`

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

## Advanced Example

```javascript
var postcss = require('postcss');
var sprites = require('postcss-sprites');
var Q       = require('q');
var opts    = {
	stylesheetPath: './dist',
	spritePath    : './dist/images/sprite.png',
	verbose       : true,
	filterBy      : function(image) {
		return /\.jpg$/gi.test(image.url);
	},
	groupBy       : function(image) {
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
