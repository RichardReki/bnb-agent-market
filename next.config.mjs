/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { webpack }) => {
    // Optional dependencies pulled in transitively by the wallet stack that this build never reaches
    // at runtime. Ignoring them is deliberate — installing them would ship dead weight, and leaving
    // them unresolved turns every build into a wall of warnings that hides real ones.
    //
    //   @x402/*        wagmi's connector barrel imports Coinbase's baseAccount, which optionally
    //                  imports Coinbase's @x402 client stack. We only use the injected connector, so
    //                  baseAccount is never instantiated and these modules are never required.
    //   pino-pretty    WalletConnect's logger uses pino; pino lazily requires pino-pretty only when a
    //                  transport is configured for human-readable dev output. We configure none.
    //   async-storage  MetaMask's SDK imports React Native's storage adapter for its RN target. This
    //                  is a web build; the RN branch is dead code here.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@x402\/|pino-pretty$|@react-native-async-storage\/)/,
      }),
    );
    return config;
  },
};
export default nextConfig;
