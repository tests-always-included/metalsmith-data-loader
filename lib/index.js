/**
 * @param {Object} destination
 * Metalsmith Data Loader
 *
 * Loads files and places their data structures in as file metadata.
 *
 * @example
 * const dataLoader = require("metalsmith-data-loader");
 *
 * // Create your Metalsmith instance and add this like other middleware.
 * metalsmith.use(dataLoader({
 *     // configuration goes here
 * }));
 *
 * @module metalsmith-data-loader
 */
"use strict";

/**
 * Metalsmith file object.
 *
 * @typedef {Object} metalsmithFile
 * @property {Buffer} contents
 * @property {string} mode
 */

/**
 * Metalsmith collection of file objects.
 *
 * @typedef {Object.<string,module:metalsmith-data-loader~metalsmithFile>} metalsmithFileCollection
 */

const debug = require("debug")("metalsmith-data-loader");
const fs = require("fs");
const jsYaml = require("js-yaml");
const path = require("path");
const pluginKit = require("metalsmith-plugin-kit");

const loadModelHash = new Map();

/**
 * Removes a file from the list of files to process.  This only
 * happens when it is included by another file through this data
 * loader and when the option is enabled.
 *
 * @param {string} sourceFile filename
 * @param {string} modelFile Not resolved to a full path
 * @param {module:metalsmith-data-loader~metalsmithFileCollection} files Metalsmith files object
 * @param {module:metalsmith-data-loader~options} options
 */
function removeSource(sourceFile, modelFile, files, options) {
    if (!options.removeSource) {
        return;
    }

    if (modelFile.charAt(0) === "!") {
        // We don't remove files outside the source tree
        return;
    }

    const rootPathLength = path.resolve(path.sep).length;
    const resolved = path.resolve(path.sep, sourceFile, "..", modelFile).slice(rootPathLength);

    if (files[resolved]) {
        debug(`Removing source file: ${resolved}`);
        delete files[resolved];
    } else {
        debug(`Did not fine file to remove: ${resolved}`);
    }
}


/**
 * Resolves a file path and checks to make sure it exists.
 *
 * Paths can look like any of these:
 *
 *   model.json                -> Relative to file
 *   ./model.json              -> Relative to file
 *   dir/model.yaml            -> Relative to file
 *   ../model.json             -> Relative to file
 *   /model.yaml               -> From root of source
 *   /dir/model.json           -> From root of source
 *   !model.yaml               -> From models folder (not in source)
 *   !dir/model.json           -> From models folder (not in source)
 *
 * @param {module:metalsmith} metalsmith Metalsmith instance.
 * @param {string} sourceFile Filename being processed.
 * @param {string} modelFile Reference inside the file's metadata.
 * @param {module:metalsmith-data-loader~options} options
 * @return {string}
 */
function resolveFile(metalsmith, sourceFile, modelFile, options) {
    if (modelFile.charAt(0) === "!") {
        // Resolve against models folder
        return metalsmith.path(options.directory, modelFile.slice(1));
    }

    if (modelFile.charAt(0) === "/") {
        // Resolve against root of source
        return metalsmith.path(metalsmith.source(), modelFile.slice(1));
    }

    // Resolve against file being processed
    return metalsmith.path(metalsmith.source(), sourceFile, "..", modelFile);
}


/**
 * Loads a file asynchronously and places metadata on the destination
 * object.
 *
 * @param {string} dataFile Resolved filename to load.
 * @return {Promise.<*>} The loaded data.
 */
function loadModel(dataFile) {
    const previousLoad = loadModelHash.get(dataFile);

    if (previousLoad) {
        return previousLoad;
    }

    const promise = new Promise((resolve, reject) => {
        fs.readFile(dataFile, "utf8", (err, data) => {
            if (err) {
                reject(new Error(`Failed reading file ${dataFile}: ${err.toString()}`));
            } else {
                resolve(data);
            }
        });
    }).then((data) => {
        debug("Parsing: %s", dataFile);

        if (dataFile.match(/\.json$/)) {
            return JSON.parse(data);
        }

        if (dataFile.match(/\.ya?ml/)) {
            return jsYaml.load(data);
        }

        throw new Error(`Unknown data format: ${dataFile}`);
    });
    loadModelHash.set(dataFile, promise);

    return promise;
}


/**
 * Options for the middleware factory.
 *
 * @typedef {Object} options
 * @property {string} [dataProperty=data] Name of property to use for loading models.
 * @property {string} [directory=models/] Path for storing external modules.
 * @property {module:metalsmith-plugin-kit~matchList} [match] Files to match. Defaults to all files.
 * @property {module:metalsmith-plugin-kit~matchOptions} [matchOptions={}] Options controlling how to match files.
 * @property {boolean} [removeSource=true] When truthy, remove the model from the build result.
 * @see {@link https://github.com/fidian/metalsmith-plugin-kit}
 */

/**
 * Factory to build middleware for Metalsmith.
 *
 * @param {module:metalsmith-data-loader~options} options
 * @return {Function}
 */
module.exports = function (options) {
    options = pluginKit.defaultOptions({
        dataProperty: "data",
        directory: "models/",
        match: "**/*",
        ignoreReadFailure: false,
        matchOptions: {},
        removeSource: false
    }, options);

    return pluginKit.middleware({
        after: () => {
            // Free memory
            loadModelHash.clear();
        },
        before: () => {
            // Reset
            loadModelHash.clear();
        },
        each: (filename, file, files, metalsmith) => {
            const promises = [];
            const val = file[options.dataProperty];
            const type = typeof val;

            /**
             * Loads a single data file
             *
             * @param {string} modelFile Location of data file to load
             * @param {Object} target Target object
             * @param {string} propName Target object property name
             */
            function addJob(modelFile, target, propName) {
                removeSource(filename, modelFile, files, options);
                const resolved = resolveFile(metalsmith, filename, modelFile, options);
                debug("Loading file (%s) + (%s): %s", filename, modelFile, resolved);
                const promise = loadModel(resolved).then((data) => {
                    debug("Successful read of file: %s", resolved);
                    target[propName] = data;
                }, (err) => {
                    debug(err.toString());

                    if (!options.ignoreReadFailure) {
                        throw new Error(`Unable to process ${resolved}, needed by ${filename}: ${err.toString()}`);
                    }
                });
                promises.push(promise);
            }

            if (type === "string") {
                debug("Adding single job: %s", filename);
                addJob(val, file, options.dataProperty);
            } else if (Array.isArray(val)) {
                debug("Adding array job: %s", filename);
                val.forEach((item, index) => {
                    addJob(item, val, index);
                });
            } else if (type === "object") {
                debug("Adding object job: %s", filename);
                Object.keys(val).forEach((propName) => {
                    addJob(val[propName], val, propName);
                });
            }

            return Promise.all(promises);
        },
        match: options.match,
        matchOptions: options.matchOptions,
        name: "metalsmith-data-loader"
    });
};
