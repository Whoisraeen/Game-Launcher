"use strict";
const getSSOTokenFromFile = require("./getSSOTokenFromFile-CRmHOEdm.js");
const main = require("./main-D3S0_oIl.js");
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
