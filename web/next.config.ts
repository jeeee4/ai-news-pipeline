import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === "production" ? "/ai-news-pipeline" : "",
  trailingSlash: true,
};

export default nextConfig;
