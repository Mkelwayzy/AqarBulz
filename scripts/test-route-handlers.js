const assert = require("assert");

// Polyfill Request / Response / Headers for Node test environment if needed
const { POST: loginHandler } = require("../.tests_dist/api_auth_login.js", { paths: [] });
