import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: { serverActions: { allowedOrigins: ["*"] } },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      // pptxgenjs 등이 사용하는 node: 프로토콜 URI를 일반 모듈 이름으로 변환
      // (브라우저 번들에서 Node.js 전용 모듈 stub 처리)
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(/^node:/, (resource: { request: string }) => {
          resource.request = resource.request.replace(/^node:/, '');
        })
      );
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        https: false,
        http: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        path: false,
        os: false,
        zlib: false,
        buffer: false,
        util: false,
        events: false,
        url: false,
        querystring: false,
      };
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
