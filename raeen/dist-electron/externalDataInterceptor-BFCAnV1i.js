"use strict";
const getSSOTokenFromFile = require("./getSSOTokenFromFile-CoG4niWH.js");
const main = require("./main-BA6rTjtU.js");
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
