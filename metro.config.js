const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support ".sql" files imported as strings (supabase schema bundled for dev).
config.resolver.sourceExts.push('sql');

// Expo SQLite loads its WebAssembly module as a Metro asset on web.
config.resolver.assetExts.push('wasm');

module.exports = config;
