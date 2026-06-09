import { Helmet } from "react-helmet-async";

const SITE_URL = "https://adaptiveprep.org";

interface PageSeoProps {
  title: string;
  description: string;
  /** Route path with leading slash, e.g. "/login" */
  path: string;
}

/**
 * Per-route head tags: title, meta description, canonical, and Open Graph.
 * Overrides the static defaults in index.html for JS-executing crawlers.
 */
export function PageSeo({ title, description, path }: PageSeoProps) {
  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content="website" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
