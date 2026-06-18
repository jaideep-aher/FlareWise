import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The transformer runtime ships native ONNX binaries that must not be bundled.
  serverExternalPackages: ["@huggingface/transformers"]
};

export default nextConfig;
