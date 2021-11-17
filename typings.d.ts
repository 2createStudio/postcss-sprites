import { Plugin, AnyNode, Comment } from 'postcss';

interface Spritesheet {
	path: string,
	image: string,
	groups: string[],
	extension: string,
	coordinates: { width: number, height: number, x: number, y: number },
	properties: { width: number, height: number }
}

interface Image {
	/**
	 * An absolute path to the stylesheet.
	 */
	styleFilePath: string,

	/**
	 * An absolute path to the image.
	 */
	path: string,

	/**
	 * The url found in your stylesheet including the query params.
	 */
	originalUrl: string,

	/**
	 * A normalized version of the original url.
	 */
	url: string,

	/**
	 * The retina ratio of your image.
	 */
	ratio: number,

	/**
	 * Indicates whenever your image is retina.
	 */
	retina: boolean,

	/**
	 * The groups associated with the image.
	 */
	groups: string[],

	/**
	 * The string used as reference in your stylesheet.
	 */
	token: string,

	/**
	 * The position & dimensions of image in generated spritesheet.
	 */
	coords: { width: number, height: number, x: number, y: number },

	/**
	 * A relative path to the generated spritesheet.
	 */
	spritePath: string,

	/**
	 * A CSS url to the generated spritesheet.
	 */
	spriteUrl: string,

	/**
	 * The total width of the spritesheet.
	 */
	spriteWidth: number,

	/**
	 * The total height of the spritesheet.
	 */
	spriteHeight: number
}

interface Hooks {
	/**
	 * Hook that allows to rewrite the data of produced spritesheet.
	 */
	onSaveSpritesheet?: (options: Options, spritesheet: Spritesheet) => string|object|Promise<string|object>,

	/**
	 * Hook that allows to rewrite the CSS output for an image.
	 */
	onUpdateRule?: (rule: AnyNode, token: Comment, image: Image) => void
}

interface Spritesmith {

	/**
	 * The [engine](https://github.com/Ensighten/spritesmith#engines).
	 */
	engine?: string,

	/**
	 * The [algorithm](https://github.com/Ensighten/spritesmith#algorithms).
	 */
	algorithm?: 'top-down' | 'left-right' | 'diagonal' | 'alt-diagonal' | 'binary-tree',

	/**
	 * The space between images in spritesheet.
	 */
	padding?: number,

	/**
	 * The configuration of the [engine](https://github.com/Ensighten/spritesmith#engines).
	 */
	engineOpts?: object,

	/**
	 * The export options of the [engine](https://github.com/Ensighten/spritesmith#engines).
	 */
	exportOpts?: object,
}

interface Options {
	/**
	 * Relative path to the folder that will keep your output stylesheet(s). If it's null the path of CSS file will be used.
	 */
	stylesheetPath?: string,

	/**
	 * Relative path to the folder that will keep your output spritesheet(s).
	 */
	spritePath: string,

	/**
	 * Your base path that will be used for images with absolute CSS urls.
	 */
	basePath?: string,

	/**
	 * Indicates whether the url should be relative against current CSS context or original CSS stylesheet file.
	 */
	relativeTo?: string,

	/**
	 * Defines filter functions that will manipulate the list of images founded in your stylesheet(s).
	 */
	filterBy?: (image: Image) => Promise<void>,

	/**
	 * Defines group functions that will manipulate the list of images founded in your stylesheet(s).
	 */
	groupBy?: (image: Image) => Promise<string>,

	/**
	 * Defines whether or not to search for retina mark in the filename.
	 */
	retina?: boolean,

	/**
	 * Process hooks.
	 */
	hooks?: Hooks,

	/**
	 * A [spritesmith](https://github.com/Ensighten/spritesmith) configuration.
	 */
	spritesmith?: Spritesmith,

	/**
	 * A [svg-sprite](https://github.com/jkphl/svg-sprite#configuration-basics) configuration.
	 */
	svgsprite?: object,

	/**
	 * Prints the plugin output to the console.
	 */
	verbose?: boolean

}

declare function sprites(options: Options): Plugin;

export = sprites;
