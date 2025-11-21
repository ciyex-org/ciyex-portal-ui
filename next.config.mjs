/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // skip type errors during production build
    ignoreBuildErrors: true,
  },
  // Configure Turbopack for SVG imports as React components
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  // Webpack config for fallback/compatibility
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
};

export default nextConfig;
