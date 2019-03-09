metalsmith-data-loader
======================

Metalsmith plugin to add extra metadata from external files.  Very similar to [metalsmith-models] with the difference that this allows you to load information from either a folder outside of the source or files within the source tree.  Also, this one lets you use JSON or YAML files.

[![npm version][npm-badge]][npm-link]
[![Build Status][travis-badge]][travis-link]
[![Dependencies][dependencies-badge]][dependencies-link]
[![Dev Dependencies][devdependencies-badge]][devdependencies-link]
[![codecov.io][codecov-badge]][codecov-link]

The "dependencies" badge says there's a potential problem with `js-yaml` and suggests that packages use `.safeLoad()`, which is exactly what this plugin does.


What It Does
------------

When working with templates, you sometimes want to generate something like a table in Markdown from external data.  You can do this with [metalsmith-hbt-md] but you need to get the extra data in your metadata.  That can be accomplished by [metalsmith-models] as long as you are willing to separate your source data from the template that needs it.

This plugin differs from that approach, allowing you to have your Markdown files adjacent to the data that is inserted into the table.  This works better with an example.

`table.md`:

    ---
    title: Just a test file to illustrate why the module is useful.
    data: contacts.yaml
    ---

    Here's a great list of contacts:

    | First | Last | Email |
    |-------|------|-------|
    {{#data}}| {{first}} | {{last}} | {{email}} |
    {{/data}

`contacts.yaml` (right next to the markdown):

    -
        first: Tyler
        last: Akins
        email: fidian@rumkin.com
    -
        first: Jane
        last: Doe
        email: j.doe@example.com

This isn't limited to table generation.  You could load metadata specific to a collection of pages.  Maybe you have a site where different authors maintain different pages and you could point to a single source for the author's information.

If you prefer to work with code, there is an [example repository][example] set up that illustrates how the plugin functions.


Installation
------------

`npm` can do this for you.

    npm install --save metalsmith-data-loader


Usage
-----

Include this like you would include any other plugin.  First, a CLI example that shows the default options.  You don't need to specify any options unless you want to override their values.

    {
        "plugins": {
            "metalsmith-data-loader": {
                "dataProperty": "data",
                "directory": "models/",
                "ignoreReadFailure": false,
                "match": "**/*",
                "matchOptions": {},
                "removeSource": false
            }
        }
    }

And here is the JavaScript example.  This includes brief descriptions of each of the options.

    // Load this, just like other plugins.
    var dataLoader = require("metalsmith-data-loader");

    // Then in your list of plugins you use it.
    .use(dataLoader())

    // Alternately, you can specify options.  The values shown here are
    // the defaults.
    .use(dataLoader({
        // Property name to scan for files to include.
        dataProperty: "data",

        // Directory containing models.  This is relative to the working
        // directory.  It does not need to exist unless you start loading
        // files from here.
        directory: "models/",

        // Pattern of files to match in case you want to limit processing
        // to specific files.
        match: "**/*",

        // Options to ignore read failures, useful if you want to continue
        // processing even if the file is not found. When this is set to false,
        // the build will throw an exception when trying to load a file that
        // does not exist and is typically what people want.
        ignoreReadFailure: false,

        // Options for matching files.  See metalsmith-plugin-kit for
        // more information.
        matchOptions: {},

        // Flag indicating that the loaded data object should be removed
        // if it is found in the source.  Use this so your built project
        // doesn't include the metadata in the rendered output and another
        // copy that was consumed during the build.
        removeSource: false
    })

This uses [metalsmith-plugin-kit] to match files.  The `.matchOptions` object can be filled with options control how the matching behaves.

From here, you now need to specify the files to include.  These examples all assume you didn't change `dataProperty`.

    ---
    title: A single string loads one file
    data: my-model.json
    ---

When loaded this way, the `data` metadata is replaced with the parsed contents of `my-model.json`.

    ---
    title: An object holding a map of filenames.
    data:
        users: users.json
        services: services.yaml
    ---

This lets you load multiple files and assign them to properties on the `data` object.  One would access the information by using `{{data.users}}` or `{{data.services}}` in [Mustache] templates.

    ---
    title: An array of files.  The filenames are replaced with their contents.
    data:
        - file1.yaml
        - file2.yaml
    ---

The two files are loaded asynchronously and will replace the `file1.yaml` and `file2.yaml`.  You would access these in [Mustache] by using `{{data.0}}` and `{{data.1}}` or you can iterate over `{{#data}}`.


Resolving Files
---------------

The combination of the `directory` configuration option and the `data` metadata property dictate which files are loaded.  This table can help illustrate the relationship.  In all of the examples, the `directory` configuration option is set to "models/" and the source file is always "src/path/file.md".

| Metadata Path         | File to Load             | Description                                                       |
|-----------------------|--------------------------|-------------------------------------------------------------------|
| file.yaml             | src/path/file.yaml       | Relative to source file.                                          |
| ../file.yaml          | src/file.yaml            | Relative to the source file.                                      |
| /other-path/file.yaml | src/other-path/file.yaml | Resolved from root of source folder.                              |
| /../file.yaml         | file.yaml                | Can load things outside the source folder.                        |
| !file.yaml            | models/file.yaml         | Resolved from the `directory`, not source folder. See the note!   |
| !../file.yaml         | file.yaml                | Can load items from outside the models `directory`. See the note! |

**Note:** When the metadata path starts with an exclamation point (`!`), you must use quotes in your YAML frontmatter. Here's a sample.

    ---
    title: Sample file that loads a file from a models directory
    data: "!file-from-models.json"
    ---

You can play with the [example repository][example] to get a better handle on how the plugin works.


API
---

<a name="module_metalsmith-data-loader"></a>

## metalsmith-data-loader
**Params**

- destination <code>Object</code> - Metalsmith Data Loader

Loads files and places their data structures in as file metadata.

**Example**  
```js
var dataLoader = require("metalsmith-data-loader");

// Create your Metalsmith instance and add this like other middleware.
metalsmith.use(dataLoader({
    // configuration goes here
}));
```

* [metalsmith-data-loader](#module_metalsmith-data-loader)
    * [module.exports(options)](#exp_module_metalsmith-data-loader--module.exports) ⇒ <code>function</code> ⏏
        * [~removeSource(sourceFile, modelFile, files, options)](#module_metalsmith-data-loader--module.exports..removeSource)
        * [~resolveFile(metalsmith, sourceFile, modelFile, options)](#module_metalsmith-data-loader--module.exports..resolveFile) ⇒ <code>string</code>
        * [~loadModel(dataFile)](#module_metalsmith-data-loader--module.exports..loadModel) ⇒ <code>Promise.&lt;\*&gt;</code>
        * [~metalsmithFile](#module_metalsmith-data-loader--module.exports..metalsmithFile) : <code>Object</code>
        * [~metalsmithFileCollection](#module_metalsmith-data-loader--module.exports..metalsmithFileCollection) : <code>Object.&lt;string, module:metalsmith-data-loader--module.exports~metalsmithFile&gt;</code>
        * [~options](#module_metalsmith-data-loader--module.exports..options) : <code>Object</code>

<a name="exp_module_metalsmith-data-loader--module.exports"></a>

### module.exports(options) ⇒ <code>function</code> ⏏
Factory to build middleware for Metalsmith.

**Kind**: Exported function  
**Params**

- options [<code>options</code>](#module_metalsmith-data-loader--module.exports..options)

<a name="module_metalsmith-data-loader--module.exports..removeSource"></a>

#### module.exports~removeSource(sourceFile, modelFile, files, options)
Removes a file from the list of files to process.  This only
happens when it is included by another file through this data
loader and when the option is enabled.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
**Params**

- sourceFile <code>string</code> - filename
- modelFile <code>string</code> - Not resolved to a full path
- files [<code>metalsmithFileCollection</code>](#module_metalsmith-data-loader--module.exports..metalsmithFileCollection) - Metalsmith files object
- options [<code>options</code>](#module_metalsmith-data-loader--module.exports..options)

<a name="module_metalsmith-data-loader--module.exports..resolveFile"></a>

#### module.exports~resolveFile(metalsmith, sourceFile, modelFile, options) ⇒ <code>string</code>
Resolves a file path and checks to make sure it exists.

Paths can look like any of these:

  model.json                -> Relative to file
  ./model.json              -> Relative to file
  dir/model.yaml            -> Relative to file
  ../model.json             -> Relative to file
  /model.yaml               -> From root of source
  /dir/model.json           -> From root of source
  !model.yaml               -> From models folder (not in source)
  !dir/model.json           -> From models folder (not in source)

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
**Params**

- metalsmith <code>module:metalsmith</code> - Metalsmith instance.
- sourceFile <code>string</code> - Filename being processed.
- modelFile <code>string</code> - Reference inside the file's metadata.
- options [<code>options</code>](#module_metalsmith-data-loader--module.exports..options)

<a name="module_metalsmith-data-loader--module.exports..loadModel"></a>

#### module.exports~loadModel(dataFile) ⇒ <code>Promise.&lt;\*&gt;</code>
Loads a file asynchronously and places metadata on the destination
object.

**Kind**: inner method of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
**Returns**: <code>Promise.&lt;\*&gt;</code> - The loaded data.  
**Params**

- dataFile <code>string</code> - Resolved filename to load.

<a name="module_metalsmith-data-loader--module.exports..metalsmithFile"></a>

#### module.exports~metalsmithFile : <code>Object</code>
Metalsmith file object.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
**Properties**

- contents <code>Buffer</code>  
- mode <code>string</code>  

<a name="module_metalsmith-data-loader--module.exports..metalsmithFileCollection"></a>

#### module.exports~metalsmithFileCollection : <code>Object.&lt;string, module:metalsmith-data-loader--module.exports~metalsmithFile&gt;</code>
Metalsmith collection of file objects.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
<a name="module_metalsmith-data-loader--module.exports..options"></a>

#### module.exports~options : <code>Object</code>
Options for the middleware factory.

**Kind**: inner typedef of [<code>module.exports</code>](#exp_module_metalsmith-data-loader--module.exports)  
**See**: [https://github.com/fidian/metalsmith-plugin-kit](https://github.com/fidian/metalsmith-plugin-kit)  
**Properties**

- dataProperty <code>string</code> - Name of property to use for loading models.  
- directory <code>string</code> - Path for storing external modules.  
- match <code>module:metalsmith-plugin-kit~matchList</code> - Files to match. Defaults to all files.  
- matchOptions <code>module:metalsmith-plugin-kit~matchOptions</code> - Options controlling how to match files.  
- removeSource <code>boolean</code> - When truthy, remove the model from the build result.  



Development
-----------

This uses Jasmine, Istanbul and ESLint for tests.

    # Install all of the dependencies
    npm install

    # Run the tests
    npm run test

This plugin is licensed under the [MIT License][License] with an additional non-advertising clause.  See the [full license text][License] for information.


[codecov-badge]: https://img.shields.io/codecov/c/github/tests-always-included/metalsmith-data-loader/master.svg
[codecov-link]: https://codecov.io/github/tests-always-included/metalsmith-data-loader?branch=master
[dependencies-badge]: https://img.shields.io/david/tests-always-included/metalsmith-data-loader.svg
[dependencies-link]: https://david-dm.org/tests-always-included/metalsmith-data-loader
[devdependencies-badge]: https://img.shields.io/david/dev/tests-always-included/metalsmith-data-loader.svg
[devdependencies-link]: https://david-dm.org/tests-always-included/metalsmith-data-loader#info=devDependencies
[example]: https://github.com/fidian/metalsmith-data-loader-example
[License]: LICENSE.md
[metalsmith-hbt-md]: https://github.com/ahdiaz/metalsmith-hbt-md
[metalsmith-models]: https://github.com/jaichandra/metalsmith-models
[metalsmith-plugin-kit]: https://github.com/fidian/metalsmith-plugin-kit
[Mustache]: https://mustache.github.io/
[npm-badge]: https://img.shields.io/npm/v/metalsmith-data-loader.svg
[npm-link]: https://npmjs.org/package/metalsmith-data-loader
[travis-badge]: https://img.shields.io/travis/tests-always-included/metalsmith-data-loader/master.svg
[travis-link]: http://travis-ci.org/tests-always-included/metalsmith-data-loader
