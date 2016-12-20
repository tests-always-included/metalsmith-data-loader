"use strict";

var mockRequire;

mockRequire = require("mock-require");

describe("metalsmith-data-loader", function () {
    var fsMock, metalsmith, plugin;

    beforeEach(function () {
        var Metalsmith;

        // Load metalsmith without mocks.
        Metalsmith = require("metalsmith");
        metalsmith = new Metalsmith("/cwd");

        // fs
        fsMock = jasmine.createSpyObj("fsMock", [
            "readFile"
        ]);
        fsMock.readFile.andCallFake(function (filename, encoding, callback) {
            var content;

            content = null;

            if (filename.match(/broken/)) {
                // For triggering parse errors
                content = "BROKEN";
            } else if (filename.match(/\.yaml$/)) {
                content = "yaml: true";
            } else if (filename.match(/\.json$/)) {
                content = "{\"json\":true}";
            } else if (filename.match(/\.txt$/)) {
                content = "Text!";
            }
            setTimeout(function () {
                if (content) {
                    callback(null, content);
                } else {
                    callback(new Error("Bad file type for file: " + filename));
                }
            });
        });
        mockRequire("fs", fsMock);

        // Load the plugin with any mocks.
        plugin = mockRequire.reRequire("../");
    });
    afterEach(function () {
        mockRequire.stopAll();
    });
    it("does not break with no files and no configuration", function (done) {
        var files;

        files = {};
        plugin()(files, metalsmith, function (err) {
            expect(err).toBeFalsy();
            expect(files).toEqual({});
            done();
        });
    });
    it("matches all files by default", function (done) {
        var files;

        files = {
            a: {
                data: "test.yaml"
            },
            b: {
                data: "test.json"
            }
        };
        plugin()(files, metalsmith, function (err) {
            expect(err).toBeFalsy();
            expect(files).toEqual({
                a: {
                    data: {
                        yaml: true
                    }
                },
                b: {
                    data: {
                        json: true
                    }
                }
            });
            done();
        });
    });
    it("can use any property name", function (done) {
        var files;

        files = {
            a: {
                data: "wrong.json",
                sparkle: "correct.json"
            }
        };
        plugin({
            dataProperty: "sparkle"
        })(files, metalsmith, function (err) {
            expect(err).toBeFalsy();
            expect(files).toEqual({
                a: {
                    data: "wrong.json",
                    sparkle: {
                        json: true
                    }
                }
            });
            done();
        });
    });
    it("uses matching options", function (done) {
        var files;

        files = {
            X: {
                data: "test.yaml"
            },
            b: {
                data: "test.yaml"
            },
            "a/.hideXthis": {
                data: "test.yaml"
            }
        };
        plugin({
            match: "**/*X*",
            matchOptions: {
                dot: true
            }
        })(files, metalsmith, function (err) {
            expect(err).toBeFalsy();
            expect(files).toEqual({
                X: {
                    data: {
                        yaml: true
                    }
                },
                b: {
                    data: "test.yaml"
                },
                "a/.hideXthis": {
                    data: {
                        yaml: true
                    }
                }
            });
            done();
        });
    });
    describe("removing source files", function () {
        it("removes files in source tree", function (done) {
            var files;

            files = {
                "test.html": {
                    data: "test.json"
                },
                "test.json": {},
                "test2/x": {
                    data: "test2.json"
                },
                "test2/y": {
                    data: "test2.json"
                },
                "test2/test2.json": {}
            };
            plugin({
                removeSource: true
            })(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "test.html": {
                        data: {
                            json: true
                        }
                    },
                    "test2/x": {
                        data: {
                            json: true
                        }
                    },
                    "test2/y": {
                        data: {
                            json: true
                        }
                    }
                });
                done();
            });
        });
        it("removes files when used with leading slash", function (done) {
            var files;

            files = {
                "a/b": {
                    data: "/file.json"
                },
                "file.json": {}
            };
            plugin({
                removeSource: true
            })(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "a/b": {
                        data: {
                            json: true
                        }
                    }
                });
                done();
            });
        });
        it("ignores files in models folder", function (done) {
            var files;

            files = {
                "a/b": {
                    data: "!file.json"
                },
                "file.json": {},
                "a/file.json": {}
            };
            plugin({
                removeSource: true
            })(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "a/b": {
                        data: {
                            json: true
                        }
                    },
                    "file.json": {},
                    "a/file.json": {}
                });
                done();
            });
        });
    });
    describe("metadata definitions", function () {
        it("processes strings", function (done) {
            var files;

            files = {
                string: {
                    data: "x.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    string: {
                        data: {
                            json: true
                        }
                    }
                });
                done();
            });
        });
        it("processes arrays", function (done) {
            var files;

            files = {
                array: {
                    data: [
                        "x.json",
                        "y.yaml"
                    ]
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    array: {
                        data: [
                            {
                                json: true
                            },
                            {
                                yaml: true
                            }
                        ]
                    }
                });
                done();
            });
        });
        it("processes objects", function (done) {
            var files;

            files = {
                object: {
                    data: {
                        x: "x.json",
                        y: "y.yaml"
                    }
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    object: {
                        data: {
                            x: {
                                json: true
                            },
                            y: {
                                yaml: true
                            }
                        }
                    }
                });
                done();
            });
        });
        it("rejects other types of input", function (done) {
            var files;

            files = {
                number: {
                    data: 7
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    number: {
                        data: 7
                    }
                });
                done();
            });
        });
    });
    describe("data formats", function () {
        it("handles JSON", function (done) {
            var files;

            files = {
                a: {
                    data: "x.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    a: {
                        data: {
                            json: true
                        }
                    }
                });
                done();
            });
        });
        it("accepts JSON errors", function (done) {
            var files;

            files = {
                a: {
                    data: "broken.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeDefined();
                done();
            });
        });
        it("handles YAML", function (done) {
            var files;

            files = {
                a: {
                    data: "x.yaml"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    a: {
                        data: {
                            yaml: true
                        }
                    }
                });
                done();
            });
        });
        it("accepts YAML errors", function (done) {
            var files;

            files = {
                a: {
                    data: "broken.yaml"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeDefined();
                done();
            });
        });
        it("breaks on other types of input", function (done) {
            var files;

            // .txt is used because fs won't throw an error with it
            files = {
                a: {
                    data: "test.txt"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeDefined();
                done();
            });
        });
    });
    describe("file loading", function () {
        it("sends errors back", function (done) {
            var files;

            // Use an unconfigured extension for the fs mock
            files = {
                a: {
                    data: "xxx"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeDefined();
                done();
            });
        });
    });
    describe("path resolution", function () {
        beforeEach(function () {
            fsMock.readFile.andCallFake(function (filename, encoding, callback) {
                callback(null, Buffer.from(JSON.stringify(filename), "utf8"));
            });
        });
        it("resolves near file", function (done) {
            var files;

            files = {
                "same/folder": {
                    data: "file.json"
                },
                "the/parent/folder": {
                    data: "../file.json"
                },
                "child/folder": {
                    data: "model/file.json"
                },
                "with/period": {
                    data: "./file.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "same/folder": {
                        data: "/cwd/src/same/file.json"
                    },
                    "the/parent/folder": {
                        data: "/cwd/src/the/file.json"
                    },
                    "child/folder": {
                        data: "/cwd/src/child/model/file.json"
                    },
                    "with/period": {
                        data: "/cwd/src/with/file.json"
                    }
                });
                done();
            });
        });
        it("resolves at root of source", function (done) {
            var files;

            files = {
                "a/b": {
                    data: "/file.json"
                },
                "going/deeper": {
                    data: "/a/b/c/file.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "a/b": {
                        data: "/cwd/src/file.json"
                    },
                    "going/deeper": {
                        data: "/cwd/src/a/b/c/file.json"
                    }
                });
                done();
            });
        });
        it("resolves in models directory", function (done) {
            var files;

            files = {
                "a/b": {
                    data: "!file.json"
                },
                "going/deeper": {
                    data: "!a/b/c/file.json"
                }
            };
            plugin()(files, metalsmith, function (err) {
                expect(err).toBeFalsy();
                expect(files).toEqual({
                    "a/b": {
                        data: "/cwd/models/file.json"
                    },
                    "going/deeper": {
                        data: "/cwd/models/a/b/c/file.json"
                    }
                });
                done();
            });
        });
    });
});
