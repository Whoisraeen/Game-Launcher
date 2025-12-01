"use strict";
const main = require("./main-CsYBdP1I.js");
const mergeConfigFiles = (...files) => {
  const merged = {};
  for (const file of files) {
    for (const [key, values] of Object.entries(file)) {
      if (merged[key] !== void 0) {
        Object.assign(merged[key], values);
      } else {
        merged[key] = values;
      }
    }
  }
  return merged;
};
const parseKnownFiles = async (init) => {
  const parsedFiles = await main.loadSharedConfigFiles(init);
  return mergeConfigFiles(parsedFiles.configFile, parsedFiles.credentialsFile);
};
exports.parseKnownFiles = parseKnownFiles;
