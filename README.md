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

        // Options for matching files.  See minimatch for more information.
        matchOptions: {},

        // Flag indicating that the loaded data object should be removed
        // if it is found in the source.  Use this so your built project
        // doesn't include the metadata in the rendered output and another
        // copy that was consumed during the build.
        removeSource: false
    })

This uses [minimatch] to match files.  The `.matchOptions` object can be filled with options that the [minimatch] library uses.

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


Development
-----------

This uses Jasmine, Istanbul and ESLint for tests.

    # Install all of the dependencies
    npm install

    # Run the tests
    npm run test

This plugin is licensed under the [MIT License][License] with an additional non-advertising clause.  See the [full license text][License] for information.


[codecov-badge]: https://codecov.io/github/tests-always-included/metalsmith-data-loader/coverage.svg?branch=master
[codecov-link]: https://codecov.io/github/tests-always-included/metalsmith-data-loader?branch=master
[dependencies-badge]: https://david-dm.org/tests-always-included/metalsmith-data-loader.png
[dependencies-link]: https://david-dm.org/tests-always-included/metalsmith-data-loader
[devdependencies-badge]: https://david-dm.org/tests-always-included/metalsmith-data-loader/dev-status.png
[devdependencies-link]: https://david-dm.org/tests-always-included/metalsmith-data-loader#info=devDependencies
[License]: LICENSE.md
[metalsmith-hbt-md]: https://github.com/ahdiaz/metalsmith-hbt-md
[metalsmith-models]: https://github.com/jaichandra/metalsmith-models
[minimatch]: https://github.com/isaacs/minimatch
[Mustache]: https://mustache.github.io/
[npm-badge]: https://badge.fury.io/js/metalsmith-data-loader.svg
[npm-link]: https://npmjs.org/package/metalsmith-data-loader
[travis-badge]: https://secure.travis-ci.org/tests-always-included/metalsmith-data-loader.png
[travis-link]: http://travis-ci.org/tests-always-included/metalsmith-data-loader
