/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth']
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // pdf-parse uses Buffer which needs to be available on the server
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: false,
        stream: false,
        util: false,
      }
    }
    return config
  },
}

module.exports = nextConfig