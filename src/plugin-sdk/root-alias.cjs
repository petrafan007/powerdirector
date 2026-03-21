"use strict";

const path = require("node:path");
const fs = require("node:fs");

const jitiLoaders = new Map();

function getJiti(tryNative) {
  if (jitiLoaders.has(tryNative)) {
    return jitiLoaders.get(tryNative);
  }
  const { createJiti } = require("jiti");
  const jitiLoader = createJiti(__filename, {
    interopDefault: true,
    tryNative,
    extensions: [".ts", ".tsx", ".mts", ".cts", ".mtsx", ".ctsx", ".js", ".mjs", ".cjs", ".json"],
  });
  jitiLoaders.set(tryNative, jitiLoader);
  return jitiLoader;
}

function resolveMonolithicSdk() {
  const distCandidate = path.resolve(__dirname, "..", "..", "dist", "plugin-sdk", "index.js");
  if (fs.existsSync(distCandidate)) {
    return getJiti(true)(distCandidate);
  }
  const srcCandidate = path.resolve(__dirname, "index.ts");
  if (fs.existsSync(srcCandidate)) {
    return getJiti(false)(srcCandidate);
  }
  return null;
}

function resolveSubpathModule(subpath) {
  const distCandidate = path.resolve(__dirname, "..", "..", "dist", "plugin-sdk", `${subpath}.js`);
  if (fs.existsSync(distCandidate)) {
    return getJiti(true)(distCandidate);
  }
  const srcCandidate = path.resolve(__dirname, `${subpath}.ts`);
  if (fs.existsSync(srcCandidate)) {
    return getJiti(false)(srcCandidate);
  }
  return null;
}

const proxy = new Proxy({}, {
  get(_target, prop) {
    if (prop === "__esModule") return true;
    if (prop === "default") return proxy;

    // Check if it's a known subpath exported from the SDK
    // This allows powerdirector/plugin-sdk/core to work if 'core' is requested from the root alias
    const subpathModule = resolveSubpathModule(prop);
    if (subpathModule && typeof subpathModule === "object") {
      return subpathModule;
    }

    // Fallback to monolithic index
    const monolithic = resolveMonolithicSdk();
    if (monolithic && typeof monolithic === "object" && prop in monolithic) {
      return monolithic[prop];
    }

    return undefined;
  },
  has(_target, prop) {
    const monolithic = resolveMonolithicSdk();
    return (monolithic && typeof monolithic === "object" && prop in monolithic) || !!resolveSubpathModule(prop);
  },
  ownKeys() {
    const monolithic = resolveMonolithicSdk();
    return monolithic ? Reflect.ownKeys(monolithic) : [];
  },
  getOwnPropertyDescriptor(_target, prop) {
    const monolithic = resolveMonolithicSdk();
    if (monolithic && typeof monolithic === "object" && prop in monolithic) {
      return {
        ...Reflect.getOwnPropertyDescriptor(monolithic, prop),
        configurable: true,
      };
    }
    const subpathModule = resolveSubpathModule(prop);
    if (subpathModule) {
      return {
        configurable: true,
        enumerable: true,
        value: subpathModule,
        writable: false
      };
    }
    return undefined;
  }
});

module.exports = proxy;
