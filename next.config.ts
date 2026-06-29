import type { NextConfig } from "next";

// Site estático para o GitHub Pages.
// No Pages o site fica em https://<user>.github.io/<repo>/, então o build
// precisa de basePath = "/<repo>". O workflow define PAGES_BASE_PATH com o
// nome do repositório automaticamente. Em dev local, basePath fica vazio.
const basePath = process.env.PAGES_BASE_PATH ? `/${process.env.PAGES_BASE_PATH}` : "";

const nextConfig: NextConfig = {
  output: "export", // gera site estático em out/
  basePath,
  trailingSlash: true, // o Pages serve melhor com / no fim
  images: { unoptimized: true }, // sem servidor de otimização de imagem
};

export default nextConfig;
