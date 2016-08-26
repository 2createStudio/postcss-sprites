# postcss-sprites [![Build Status](https://travis-ci.org/2createStudio/postcss-sprites.svg?branch=master)](https://travis-ci.org/2createStudio/postcss-sprites) [![npm version](https://badge.fury.io/js/postcss-sprites.svg)](http://badge.fury.io/js/postcss-sprites)

> [PostCSS](https://github.com/postcss/postcss) plugin that generates spritesheets from your stylesheets.

```css
/* Input */
.comment { background: url(images/sprite/ico-comment.png) no-repeat 0 0; }
.bubble { background: url(images/sprite/ico-bubble.png) no-repeat 0 0; }

/* ---------------- */

/* Output */
.comment { background-image: url(images/sprite.png); background-position: 0 0; }
.bubble { background-image: url(images/sprite.png); background-position: 0 -50px; }
```

----

### Usage

```javascript
var fs = require('fs');
var postcss = require('postcss');
var sprites = require('postcss-sprites');

var css = fs.readFileSync('./css/style.css', 'utf8');
var opts = {
	stylesheetPath: './dist',
	spritePath: './dist/images/'
};

postcss([sprites(opts)])
	.process(css, {
		from: './css/style.css',
		to: './dist/style.css'
	})
	.then(function(result) {
		fs.writeFileSync('./dist/style.css', result.css);
	});

```

See [PostCSS](https://github.com/postcss/postcss) docs for examples for your environment.

----

### Options

###### stylesheetPath

> Relative path to the folder that will keep your output stylesheet(s).

- Default: `./`
- Required: `true`

###### spritePath

> Relative path to the folder that will keep your output spritesheet(s).

- Default: `./`
- Required: `true`

###### basePath

> Your base path that will be used for images with absolute CSS urls.

- Default: `./`
- Required: `false`

###### relativeTo

> Indicates whether the url should be relative against current CSS context or original CSS stylesheet file.

- Default: `file`
- Required: `false`
- Options: `file|rule`

###### filterBy

> Defines filter functions that will manipulate the list of images founded in your stylesheet(s).

- Default: `[]`
- Required: `false`
- Options: `Function|Function[]`

**Every function must return a ``Promise`` which should be resolved or rejected.**

Built-in filters:

- based on `fs.stat` and used to remove non exisiting images

###### groupBy

> Defines group functions that will manipulate the list of images founded in your stylesheet(s).

- Default: `[]`
- Required: `false`
- Options: `Function|Function[]`

**Every function must return a ``Promise`` which should be resolved with a string or rejected.**

Built-in filters:

- based on `@2x` naming convention

###### retina

> Defines whether or not to search for retina mark in the filename.

- Default: `false`
- Required: `false`

###### hooks

> Defines whether or not to search for retina mark in the filename.

- Default: `{}`
- Required: `false`

###### hooks.onSaveSpritesheet

> Hook that allows to rewrite the filepath of produced spritesheet.

- Default: `null`
- Required: `false`

###### hooks.onUpdateRule

> Hook that allows to rewrite the CSS output for an image.

- Default: `null`
- Required: `false`

###### spritesmith

> A [spritesmith](https://github.com/Ensighten/spritesmith) configuration.

- Default: `{}`
- Required: `false`

###### spritesmith.engine

> The [engine](https://github.com/Ensighten/spritesmith#engines).

- Default: `pixelsmith`
- Required: `false`

###### spritesmith.algorithm

> The [algorithm](https://github.com/Ensighten/spritesmith#algorithms).

- Default: `binary-tree`
- Required: `false`

###### spritesmith.padding

> The space between images in spritesheet.

- Default: `0`
- Required: `false`

###### spritesmith.engineOpts

> The configuration of the [engine](https://github.com/Ensighten/spritesmith#engines).

- Default: `{}`
- Required: `false`

###### spritesmith.exportOpts

> The export options of the [engine](https://github.com/Ensighten/spritesmith#engines).

- Default: `{}`
- Required: `false`

###### svgsprite

> A [svg-sprite](https://github.com/jkphl/svg-sprite#configuration-basics) configuration.

----

### The Image

Every filter or group function will be called with an ``Image`` object.

###### styleFilePath

> An absolute path to the stylesheet - ``/Path/to/your/source/stylesheet.css``

###### path

> An absolute path to the image - ``/Path/to/your/image.png``

###### url

> The url found in your stylesheet - ``../image.png``

###### ratio

> The retina ratio of your image - ``2``

###### retina

> Indicates whenever your image is retina - ``true``

###### groups

> The groups associated with the image - ``['shapes', '@2x']``

###### token

> The string used as reference in your stylesheet - ``/* @replace|image.png */``

###### coords

> The position & dimensions of image in generated spritesheet - ``{ width: 20, height: 20, x: 0, y: 0 }``

###### spritePath

> A relative path to the generated spritesheet - ``dist/sprite.png``

###### spriteUrl

> A CSS url to the generated spritesheet - ``sprite.png``

###### spriteWidth

> The total width of the spritesheet - ``200``

###### spriteHeight

> The total height of the spritesheet - ``400``

----

### Advanced

- [Filter By](examples/filter-by.md)
- [Group By](examples/group-by.md)
- [Output Dimensions](examples/output-dimensions.md)
- [Skip Prefix](examples/skip-prefix.md)
- [Responsive Spritesheets](examples/responsive-spritesheets.md)
- [Relative To Rule](examples/relative-to-rule.md)

----

### Contributing

Pull requests are welcome.

```
$ git clone git@github.com:2createStudio/postcss-sprites.git
$ npm install
$ npm run watch
```
