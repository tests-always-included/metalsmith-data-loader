"use strict";

var mockRequire;

mockRequire = require("mock-require");

describe("metalsmith-data-loader", function () {
    var callPlugin, fsMock, metalsmith;

    beforeEach(function () {
        var Metalsmith;

        // Load metalsmith without mocks.
        Metalsmith = require("metalsmith");
        metalsmith = new Metalsmith("/cwd");

        // fs
        fsMock = jasmine.createSpyObj("fsMock", [
            "readFile"
        ]);
        fsMock.readFile.and.callFake(function (filename, encoding, callback) {
            var content;

            content = null;

            if (filename.match(/broken/)) {
                // For triggering parse errors
                content = "%BROKEN";
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

        // Wrap the call to the plugin so it returns a promise.
        callPlugin = (files, config) => {
            return new Promise((resolve, reject) => {
                var plugin;

                // Load the plugin with mocks.
                plugin = mockRequire.reRequire("../");
                plugin(config)(files, metalsmith, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(files);
                    }
                });
            });
        };
    });
    afterEach(function () {
        mockRequire.stopAll();
    });
    it("does not break with no files and no configuration", function () {
        return callPlugin({}).then((files) => {
            expect(files).toEqual({});
        });
    });
    it("matches all files by default", function () {
        return callPlugin({
            a: {
                data: "test.yaml"
            },
            b: {
                data: "test.json"
            }
        }).then((files) => {
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
        });
    });
    it("can use any property name", function () {
        return callPlugin({
            a: {
                data: "wrong.json",
                sparkle: "correct.json"
            }
        }, {
            dataProperty: "sparkle"
        }).then((files) => {
            expect(files).toEqual({
                a: {
                    data: "wrong.json",
                    sparkle: {
                        json: true
                    }
                }
            });
        });
    });
    it("uses matching options", function () {
        return callPlugin({
            X: {
                data: "test.yaml"
            },
            b: {
                data: "test.yaml"
            },
            "a/.hideXthis": {
                data: "test.yaml"
            }
        }, {
            match: "**/*X*",
            matchOptions: {
                dot: true
            }
        }).then((files) => {
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
        });
    });
    describe("removing source files", function () {
        it("removes files in source tree", function () {
            return callPlugin({
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
            }, {
                removeSource: true
            }).then((files) => {
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
            });
        });
        it("removes files when used with leading slash", function () {
            return callPlugin({
                "a/b": {
                    data: "/file.json"
                },
                "file.json": {}
            }, {
                removeSource: true
            }).then((files) => {
                expect(files).toEqual({
                    "a/b": {
                        data: {
                            json: true
                        }
                    }
                });
            });
        });
        it("ignores files in models folder", function () {
            return callPlugin({
                "a/b": {
                    data: "!file.json"
                },
                "file.json": {},
                "a/file.json": {}
            }, {
                removeSource: true
            }).then((files) => {
                expect(files).toEqual({
                    "a/b": {
                        data: {
                            json: true
                        }
                    },
                    "file.json": {},
                    "a/file.json": {}
                });
            });
        });
    });
    describe("metadata definitions", function () {
        it("processes strings", function () {
            return callPlugin({
                string: {
                    data: "x.json"
                }
            }).then((files) => {
                expect(files).toEqual({
                    string: {
                        data: {
                            json: true
                        }
                    }
                });
            });
        });
        it("processes arrays", function () {
            return callPlugin({
                array: {
                    data: [
                        "x.json",
                        "y.yaml"
                    ]
                }
            }).then((files) => {
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
            });
        });
        it("processes objects", function () {
            return callPlugin({
                object: {
                    data: {
                        x: "x.json",
                        y: "y.yaml"
                    }
                }
            }).then((files) => {
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
            });
        });
        it("rejects other types of input", function () {
            return callPlugin({
                number: {
                    data: 7
                }
            }).then((files) => {
                expect(files).toEqual({
                    number: {
                        data: 7
                    }
                });
            });
        });
    });
    describe("data formats", function () {
        it("handles JSON", function () {
            return callPlugin({
                a: {
                    data: "x.json"
                }
            }).then((files) => {
                expect(files).toEqual({
                    a: {
                        data: {
                            json: true
                        }
                    }
                });
            });
        });
        it("accepts JSON errors", function () {
            return callPlugin({
                a: {
                    data: "broken.json"
                }
            }).then(jasmine.fail, () => {});
        });
        it("handles YAML", function () {
            return callPlugin({
                a: {
                    data: "x.yaml"
                }
            }).then((files) => {
                expect(files).toEqual({
                    a: {
                        data: {
                            yaml: true
                        }
                    }
                });
            });
        });
        it("accepts YAML errors", function () {
            return callPlugin({
                a: {
                    data: "broken.yaml"
                }
            }).then(jasmine.fail, () => {});
        });
        it("breaks on other types of input", function () {
            return callPlugin({
                // .txt is used because fs won't throw an error with it
                a: {
                    data: "test.txt"
                }
            }).then(jasmine.fail, () => {});
        });
    });
    describe("file loading", function () {
        it("sends errors back", function () {
            return callPlugin({
                // Use an unconfigured extension for the fs mock
                a: {
                    data: "xxx"
                }
            }).then(jasmine.fail, () => {});
        });
    });
    describe("path resolution", function () {
        beforeEach(function () {
            fsMock.readFile.and.callFake(function (filename, encoding, callback) {
                callback(null, Buffer.from(JSON.stringify(filename), "utf8"));
            });
        });
        it("resolves near file", function () {
            return callPlugin({
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
            }).then((files) => {
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
            });
        });
        it("resolves at root of source", function () {
            return callPlugin({
                "a/b": {
                    data: "/file.json"
                },
                "going/deeper": {
                    data: "/a/b/c/file.json"
                }
            }).then((files) => {
                expect(files).toEqual({
                    "a/b": {
                        data: "/cwd/src/file.json"
                    },
                    "going/deeper": {
                        data: "/cwd/src/a/b/c/file.json"
                    }
                });
            });
        });
        it("resolves in models directory", function () {
            return callPlugin({
                "a/b": {
                    data: "!file.json"
                },
                "going/deeper": {
                    data: "!a/b/c/file.json"
                }
            }).then((files) => {
                expect(files).toEqual({
                    "a/b": {
                        data: "/cwd/models/file.json"
                    },
                    "going/deeper": {
                        data: "/cwd/models/a/b/c/file.json"
                    }
                });
            });
        });
    });
});
