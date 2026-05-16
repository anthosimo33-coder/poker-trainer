import createMDX from "@next/mdx";
import remarkFrontmatter from "remark-frontmatter";

const withMDX = createMDX({
  options: {
    // remark-frontmatter : le contenu MDX canonique commence par un bloc YAML
    // `---` ; sans ce plugin il serait rendu comme texte brut en haut de page.
    remarkPlugins: [remarkFrontmatter],
    rehypePlugins: [],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  pageExtensions: ["ts", "tsx", "mdx"],
  experimental: {
    mdxRs: false,
  },
};

export default withMDX(nextConfig);
