const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Support ".sql" files imported as strings (supabase schema bundled for dev).
config.resolver.sourceExts.push('sql');

module.exports = config;
