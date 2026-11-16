export default {
  poweredByHeader: false,
  devIndicators: false,
  experimental: { cpus: 2, webpackBuildWorker: true },
  async headers() {
    if (process.env.MOTIONUX_GENERATED_PREVIEW !== "1") return [];
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors http://127.0.0.1:5200; object-src 'none'; form-action 'self'; base-uri 'none'",
          },
          {
            key: "X-MotionUX-Preview",
            value: process.env.MOTIONUX_PREVIEW_KEY || "unavailable",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
};
