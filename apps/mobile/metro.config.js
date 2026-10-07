const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const workspace = path.resolve(__dirname, '../..');
const packages = ['api-client', 'business-logic', 'design-tokens', 'image-processing-config', 'types', 'validation'];
const aliases = Object.fromEntries(packages.map(name => [
  `@sds/${name}`, path.join(workspace, 'packages', name, 'src', 'index.ts'),
]));

// Isolated checkouts may share installed dependencies with another checkout.
// Always bundle this checkout's app contracts and design tokens.
config.resolver.resolveRequest = (context, moduleName, platform) =>
  context.resolveRequest(context, aliases[moduleName] ?? moduleName, platform);

module.exports = config;
