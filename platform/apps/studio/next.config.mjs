export default {
  poweredByHeader: false,
  devIndicators: false,
  transpilePackages: [
    "@motionux/app-blocks",
    "@motionux/build-core",
    "@motionux/build-canvas",
    "@motionux/app-export",
    "@motionux/preview-host",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'none'; frame-src 'self' http://127.0.0.1:5202; object-src 'none'; base-uri 'self'",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
};
