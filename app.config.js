/**
 * Extends app.json. Adds Firebase's google-services.json (needed for phone push
 * notifications) only when the file exists, so builds without it still work.
 * Download it from Firebase Console → Project settings → Your apps → Android
 * (package com.roboticstrainer.app) and put it next to this file.
 */
/* global __dirname */
const fs = require('fs');
const path = require('path');

module.exports = ({ config }) => {
  const file = './google-services.json';
  if (!fs.existsSync(path.join(__dirname, file))) return config;
  return { ...config, android: { ...config.android, googleServicesFile: file } };
};
