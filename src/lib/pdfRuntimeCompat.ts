// Load before PDF.js in both the page and its worker. These selected core-js
// modules preserve structured data (typed arrays, Maps, cycles and transfers).
import 'core-js/actual/promise/with-resolvers.js';
import 'core-js/actual/structured-clone.js';
import 'core-js/actual/array-buffer/transfer-to-fixed-length.js';
import 'core-js/actual/array/at.js';
import 'core-js/actual/array/find-last.js';
import 'core-js/actual/string/at.js';
import 'core-js/actual/string/replace-all.js';
import 'core-js/actual/typed-array/at.js';
import 'core-js/actual/object/has-own.js';
