const nextConfig = {
  // Firebase App Hosting configuration (dynamic Next.js app)
  experimental: {
    // Updated turbo config for Next.js 15+
  },
  // Exclude functions directory from builds
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Exclude functions directory from webpack compilation
    config.externals = config.externals || [];
    
    if (!isServer) {
      // Fix protobuf and gRPC issues in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
        stream: false,
        util: false,
        buffer: false,
        process: false,
        net: false,
        tls: false,
        child_process: false,
        dns: false,
        http2: false,
        '@protobufjs/codegen': false,
        '@protobufjs/fetch': false,
        '@protobufjs/path': false,
        '@protobufjs/pool': false,
        '@protobufjs/utf8': false,
        '@protobufjs/inquire': false,
        '@protobufjs/aspromise': false,
        '@protobufjs/base64': false,
        '@protobufjs/eventemitter': false,
        '@protobufjs/float': false,
        'protobufjs/minimal': false,
        '@grpc/grpc-js': false,
        '@grpc/proto-loader': false,
      };
    }
    
    // Ignore problematic modules completely
    if (isServer) {
      config.externals.push(
        '@grpc/grpc-js',
        '@grpc/proto-loader',
        'protobufjs'
      );
    }

    // Fix OpenTelemetry warnings by adding missing optional dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      '@opentelemetry/exporter-jaeger': false,
      '@opentelemetry/exporter-zipkin': false,
      '@opentelemetry/exporter-collector': false,
    };

    // Ignore handlebars warnings in webpack
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    
    // Handle handlebars require.extensions warnings
    config.module.rules.push({
      test: /node_modules\/handlebars\/lib\/index\.js$/,
      use: {
        loader: 'string-replace-loader',
        options: {
          search: 'require.extensions',
          replace: '(typeof require !== "undefined" && require.extensions)',
          flags: 'g'
        }
      }
    });

    // Suppress specific webpack warnings for optional dependencies
    config.ignoreWarnings = [
      /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-zipkin'/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-collector'/,
      /require\.extensions is not supported by webpack/,
    ];

    // Add NormalModuleReplacementPlugin to handle optional dependencies
    const webpack = require('webpack');
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-jaeger/,
        'data:text/javascript,module.exports = {}'
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-zipkin/,
        'data:text/javascript,module.exports = {}'
      ),
      new webpack.NormalModuleReplacementPlugin(
        /@opentelemetry\/exporter-collector/,
        'data:text/javascript,module.exports = {}'
      )
    );
    
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/v0/b/leadflow-4lvrr.firebasestorage.app/o/**',
      },
    ],
  },
};

export default nextConfig;
