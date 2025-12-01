"use strict";
const getSSOTokenFromFile = require("./getSSOTokenFromFile-JZVMoRxB.js");
const main = require("./main-jojGNO9L.js");
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
