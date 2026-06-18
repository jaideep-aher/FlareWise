import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // The transformer runtime ships native ONNX binaries that must not be bundled.
  serverExternalPackages: ["@huggingface/transformers"],
  // The standalone trace does not pick up onnxruntime-node's native libraries
  // (libonnxruntime.so / .node), because they load via dlopen at runtime. Copy
  // them in explicitly so the analyze route can load the model in production.
  outputFileTracingIncludes: {
    "/api/analyze": ["./node_modules/onnxruntime-node/bin/**/*"]
  }
};

export default nextConfig;
