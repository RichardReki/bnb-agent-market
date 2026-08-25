/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // wagmi's connector barrel pulls in Coinbase's baseAccount, which optionally imports Coinbase's
    // @x402 client stack (multiple submodules) we don't ship. We only use the injected connector, so
    // ignore the whole @x402/* tree rather than installing it. baseAccount is never instantiated, so
    // these modules are never required at runtime.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return config;
  },
};
export default nextConfig;
