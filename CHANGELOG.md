## CHANGELOG

### 2.0.3 (2016-01-06)
---------------------

- Revert breaking changes introduced in PR #25
- Fix scan regex

### 2.0.2 (2015-10-30)
---------------------

- ``styleFilePath`` now is relative to specific file

### 2.0.1 (2015-09-23)
---------------------

- Use ``Node.remove`` instead of ``Node.removeSelf``

### 2.0.0 (2015-08-28)
---------------------

- **Breaking Changes** 
	- Added support for PostCSS@5

### 1.0.9 (2015-07-20)
---------------------

- Added `outputDimensions` option
- Added `skipPrefix` option

### 1.0.8 (2015-07-08)
---------------------

- Fixed bug with paths in CSS output

### 1.0.7 (2015-06-29)
---------------------

- Fixed bug with multiple background-size properties

### 1.0.6 (2015-06-09)
---------------------

- Added `stylesheetPath` option
- Changed `spritePath` option
- Deprecated `externalStylsheet` option
- Deprecated `baseUrl` option
- Deprecated `spriteName` option

### 1.0.5 (2015-06-08)
---------------------

- Allowed sprites for JPEG images
- Fixed typos in docs

### 1.0.4 (2015-06-05)
---------------------

- Fixed bug with background declarations inside AtRule nodes

### 1.0.3 (2015-06-01)
---------------------

- Added support for rgb & rgba colors
- Changed date format in CHANGELOG

### 1.0.2 (2015-06-01)
---------------------

- Added tests & Travis CI
- Added new option - baseUrl
- Fixed issue [#8](https://github.com/2createStudio/postcss-sprites/issues/8)
- Fixed bug with groupBy & filterBy functions in gulp tasks
- Fixed css properties order in external stylesheet

### 1.0.1 (2015-05-28)
---------------------

- Fixed verbose option.
- Fixed confusing parts README.
- Fixed bug with spriteRef when the image is undefined.

### 1.0.0 (2015-05-27)
---------------------

- Initial version.
