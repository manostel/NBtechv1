const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Remove the ModuleScopePlugin to allow imports from node_modules
      // This plugin prevents imports outside of src/ directory
      if (webpackConfig.resolve && webpackConfig.resolve.plugins) {
        webpackConfig.resolve.plugins = webpackConfig.resolve.plugins.filter(
          plugin => {
            // Remove ModuleScopePlugin by checking its constructor name or appSrc property
            return plugin.constructor.name !== 'ModuleScopePlugin' && 
                   !(plugin.appSrc && Array.isArray(plugin.appSrc));
          }
        );
      }

      // Ensure resolve configuration exists
      webpackConfig.resolve = webpackConfig.resolve || {};
      webpackConfig.resolve.alias = webpackConfig.resolve.alias || {};
      
      // Add alias to ensure @capacitor/core resolves correctly from root node_modules
      const capacitorCorePath = path.resolve(__dirname, 'node_modules/@capacitor/core');
      webpackConfig.resolve.alias['@capacitor/core'] = capacitorCorePath;

      // Ensure node_modules resolution works for nested packages
      webpackConfig.resolve.modules = [
        path.resolve(__dirname, 'node_modules'),
        'node_modules',
        ...(webpackConfig.resolve.modules || [])
      ];

      // Also check and remove ModuleScopePlugin from webpack plugins if it exists there
      if (webpackConfig.plugins) {
        webpackConfig.plugins = webpackConfig.plugins.filter(
          plugin => {
            return plugin.constructor.name !== 'ModuleScopePlugin' && 
                   !(plugin.appSrc && Array.isArray(plugin.appSrc));
          }
        );
      }

      return webpackConfig;
    },
  },
};
