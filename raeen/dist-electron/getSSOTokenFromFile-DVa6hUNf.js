"use strict";
const fs = require("fs/promises");
const crypto = require("crypto");
const path = require("path");
const main = require("./main-BsWTb80t.js");
const getSSOTokenFilepath = (id) => {
  const hasher = crypto.createHash("sha1");
  const cacheName = hasher.update(id).digest("hex");
  return path.join(main.getHomeDir(), ".aws", "sso", "cache", `${cacheName}.json`);
};
const tokenIntercept = {};
const getSSOTokenFromFile = async (id) => {
  if (tokenIntercept[id]) {
    return tokenIntercept[id];
  }
  const ssoTokenFilepath = getSSOTokenFilepath(id);
  const ssoTokenText = await fs.readFile(ssoTokenFilepath, "utf8");
  return JSON.parse(ssoTokenText);
};
exports.getSSOTokenFilepath = getSSOTokenFilepath;
exports.getSSOTokenFromFile = getSSOTokenFromFile;
exports.tokenIntercept = tokenIntercept;
