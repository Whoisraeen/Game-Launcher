"use strict";
const getSSOTokenFromFile = require("./getSSOTokenFromFile-C6rsGdNu.js");
const main = require("./main-kI6V0JGc.js");
const externalDataInterceptor = {
  getFileRecord() {
    return main.fileIntercept;
  },
  interceptFile(path, contents) {
    main.fileIntercept[path] = Promise.resolve(contents);
  },
  getTokenRecord() {
    return getSSOTokenFromFile.tokenIntercept;
  },
  interceptToken(id, contents) {
    getSSOTokenFromFile.tokenIntercept[id] = contents;
  }
};
exports.externalDataInterceptor = externalDataInterceptor;
