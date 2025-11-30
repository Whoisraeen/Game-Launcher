"use strict";
const getSSOTokenFromFile = require("./getSSOTokenFromFile-B65Kekzt.js");
const main = require("./main-CVF81U_K.js");
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
