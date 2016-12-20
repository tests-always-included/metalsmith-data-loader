"use strict";

var debug, fs, jsYaml, minimatch, path;

debug = require("debug")("metalsmith-data-loader");
fs = require("fs");
jsYaml = require("js-yaml");
minimatch = require("minimatch");
path = require("path");

/**
 * Factory to build middleware for Metalsmith.
 *
 * @param {Object} options
 * @return {Function}
 */
module.exports = function (options) {
    var matcher;

    options = options || {};
    options.dataProperty = options.dataProperty || "data";
    options.directory = options.directory || "models/";
    options.match = options.match || "**/*";
    options.matchOptions = options.matchOptions || {};
    options.removeSource = !!options.removeSource;
    matcher = new minimatch.Minimatch(options.match, options.matchOptions);

    /**
     * Middleware function.
     *
     * @param {Object} files
     * @param {Object} metalsmith
     * @param {Function} done
     */
    return function (files, metalsmith, done) {
        var itemsLeft;


        /**
         * When done with a job, see if there's more work to do.  When we
         * have everything complete, signal the next middleware.
         *
         * @param {Error} [err]
         */
        function workComplete(err) {
            itemsLeft -= 1;
            debug("Job done.  Remaining: %d", itemsLeft);

            if (err) {
                itemsLeft = 0;
            }

            // Positive means work is remaining.
            // Zero means we should stop now (error or success).
            // Negative happens when one fails and others complete.
            if (itemsLeft === 0) {
                debug("Calling completion callback.");
                done(err);
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
         * @param {string} sourceFile File object being parsed
         * @param {string} modelFile Reference inside the file's metadata
         * @return {string}
         */
        function resolveFile(sourceFile, modelFile) {
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
         * Parse different types of files based on file extension.
         *
         * @param {string} sourceFile
         * @param {string} dataFile
         * @param {string} contents Encoded as UTF8
         * @param {Function} callback
         */
        function parseFile(sourceFile, dataFile, contents, callback) {
            try {
                debug("parsing: %s", dataFile);

                if (dataFile.match(/\.json$/)) {
                    callback(null, JSON.parse(contents));
                } else if (dataFile.match(/\.ya?ml/)) {
                    callback(null, jsYaml.safeLoad(contents));
                } else {
                    callback(new Error("Unknown data format: " + dataFile));
                }
            } catch (e) {
                callback(new Error("Error during processing " + dataFile + " for " + sourceFile + ": " + e.toString()));
            }
        }


        /**
         * Loads a file asynchronously and places metadata on the destination
         * object.
         *
         * @param {string} sourceFile
         * @param {Object} destination
         * @param {string} propName
         * @param {Function} callback
         */
        function loadModel(sourceFile, destination, propName, callback) {
            var resolvedFile;

            resolvedFile = resolveFile(sourceFile, destination[propName]);
            debug("Resolved file (%s) + (%s): %s", sourceFile, destination[propName], resolvedFile);
            fs.readFile(resolvedFile, "utf8", function (err, data) {
                if (err) {
                    callback(new Error("Error reading data file for " + sourceFile + ": " + resolvedFile));
                } else {
                    parseFile(sourceFile, resolvedFile, data, function (parseError, parsed) {
                        if (!parseError) {
                            destination[propName] = parsed;
                        }

                        callback(parseError);
                    });
                }
            });
        }


        /**
         * Removes a file from the list of files to process.  This only
         * happens when it is included by another file through this data
         * loader and when the option is enabled.
         *
         * @param {string} sourceFile
         * @param {string} dataFile Not resolved to a full path
         */
        function removeSource(sourceFile, dataFile) {
            var resolvedFile;

            if (!options.removeSource) {
                return;
            }

            if (dataFile.charAt(0) === "!") {
                // We don't remove files outside the source tree
                return;
            }

            resolvedFile = path.resolve(path.sep, sourceFile, "..", dataFile).slice(1);

            if (files[resolvedFile]) {
                debug("Removing source file: " + resolvedFile);
                delete files[resolvedFile];
            }
        }


        // Set this as a flag indicating we're queueing jobs.
        itemsLeft = 1;
        Object.keys(files).forEach(function (sourceFile) {
            var type, val;

            if (matcher.match(sourceFile) && files[sourceFile]) {
                val = files[sourceFile][options.dataProperty];
                type = typeof val;

                if (type === "string") {
                    itemsLeft += 1;
                    debug("Adding single job: %s", sourceFile);
                    removeSource(sourceFile, files[sourceFile][options.dataProperty]);
                    loadModel(sourceFile, files[sourceFile], options.dataProperty, workComplete);
                } else if (Array.isArray(val)) {
                    debug("Adding array job: %s", sourceFile);
                    val.forEach(function (item, index) {
                        itemsLeft += 1;
                        removeSource(sourceFile, item);
                        loadModel(sourceFile, val, index, workComplete);
                    });
                } else if (type === "object") {
                    debug("Adding object job: %s", sourceFile);
                    Object.keys(val).forEach(function (propName) {
                        itemsLeft += 1;
                        removeSource(sourceFile, val[propName]);
                        loadModel(sourceFile, val, propName, workComplete);
                    });
                }
            }
        });

        // Done queueing jobs.
        debug("Finished scanning for files to load");
        workComplete();
    };
};
