"use strict";

var mockRequire, path;

mockRequire = require("mock-require");
path = require("path");

describe("metalsmith-data-loader", () => {
    var callPlugin, fsMock, metalsmith;

    beforeEach(() => {
        var Metalsmith;

        // Load metalsmith without mocks.
        Metalsmith = require("metalsmith");
        metalsmith = new Metalsmith("/cwd");

        // fs
        fsMock = jasmine.createSpyObj("fsMock", [
            "readFile"
        ]);
        fsMock.readFile.and.callFake((filename, encoding, callback) => {
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
            setTimeout(() => {
                if (content) {
                    callback(null, content);
                } else {
                    callback(new Error(`Bad file type for file: ${filename}`));
                }
            });
        });
        mockRequire("fs", fsMock);

        // path
        mockRequire("path", path.posix);

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
    afterEach(() => {
        mockRequire.stopAll();
    });
    it("does not break with no files and no configuration", () => {
        return callPlugin({}).then((files) => {
            expect(files).toEqual({});
        });
    });
    it("matches all files by default", () => {
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
    it("can use any property name", () => {
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
    it("uses matching options", () => {
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
    describe("removing source files", () => {
        it("removes files in source tree", () => {
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
        it("works with a Windows environment", () => {
            mockRequire("path", path.win32);

            return callPlugin({
                "test.html": {
                    data: "test.json"
                },
                "test.json": {},
                "test2\\x": {
                    data: "test2.json"
                },
                "test2\\y": {
                    data: "test2.json"
                },
                "test2\\test2.json": {}
            }, {
                removeSource: true
            }).then((files) => {
                expect(files).toEqual({
                    "test.html": {
                        data: {
                            json: true
                        }
                    },
                    "test2\\x": {
                        data: {
                            json: true
                        }
                    },
                    "test2\\y": {
                        data: {
                            json: true
                        }
                    }
                });
            });
        });
        it("removes files when used with leading slash", () => {
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
        it("ignores files in models folder", () => {
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
    describe("metadata definitions", () => {
        it("processes strings", () => {
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
        it("processes arrays", () => {
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
        it("processes objects", () => {
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
        it("rejects other types of input", () => {
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
    describe("data formats", () => {
        it("handles JSON", () => {
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
        it("accepts JSON errors", () => {
            return callPlugin({
                a: {
                    data: "broken.json"
                }
            }).then(jasmine.fail, () => {});
        });
        it("handles YAML", () => {
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
        it("accepts YAML errors", () => {
            return callPlugin({
                a: {
                    data: "broken.yaml"
                }
            }).then(jasmine.fail, () => {});
        });
        it("breaks on other types of input", () => {
            return callPlugin({
                // .txt is used because fs won't throw an error with it
                a: {
                    data: "test.txt"
                }
            }).then(jasmine.fail, () => {});
        });
    });
    describe("file loading", () => {
        it("sends errors back", () => {
            return callPlugin({
                // Use an unconfigured extension for the fs mock
                a: {
                    data: "xxx"
                }
            }).then(jasmine.fail, () => {});
        });
    });
    describe("path resolution", () => {
        beforeEach(() => {
            fsMock.readFile.and.callFake((filename, encoding, callback) => {
                // Handle win32
                filename = filename.replace(/^[A-Z]:/, "").replace(/\\/g, "/");

                callback(null, Buffer.from(JSON.stringify(filename), "utf8"));
            });
        });
        it("resolves near file", () => {
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
        it("resolves at root of source", () => {
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
        it("resolves in models directory", () => {
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
