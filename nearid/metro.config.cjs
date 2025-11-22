const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const exclusionList = require('metro-config/src/defaults/exclusionList');

module.exports = (async () => {
    const projectRoot = __dirname;
    const workspaceRoots = [
      path.resolve(projectRoot, 'device-app'),
      path.resolve(projectRoot, 'receiver'),
      path.resolve(projectRoot, 'cloud-api'),
      path.resolve(projectRoot, 'lib'),
    ];
    
    const defaultConfig = await getDefaultConfig(projectRoot);

    const config = {
      watchFolders: [projectRoot, ...workspaceRoots],
      resolver: {
        blockList: exclusionList(
          workspaceRoots.flatMap(workspaceRoot => [
            new RegExp(`${workspaceRoot.replace(/\\/g, '\\\\')}/node_modules/.*`),
          ])
        ),
        extraNodeModules: new Proxy(
          {},
          {
            get: (target, name) => {
              if (typeof name !== 'string') {
                return undefined;
              }
              return path.join(projectRoot, `node_modules/${name}`);
            },
          }
        ),
      },
    };

    return mergeConfig(defaultConfig, config);
})();
