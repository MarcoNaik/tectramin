const path = require("path");

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@packages/backend"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
};

module.exports = nextConfig;
