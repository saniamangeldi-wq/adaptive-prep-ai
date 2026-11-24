import { Helmet } from "react-helmet-async";

const SITE_URL = "https://adaptiveprep.org";

interface PageSeoProps {
  title: string;
  description: string;
  /** Route path with leading slash, e.g. "/login" */
  path: string;
  /** Open Graph type. Use "article" for blog posts. */
  type?: "website" | "article";
  /** ISO date for article:published_time (article only) */
  publishedTime?: string;
  /** article:author (article only) */
  author?: string;
  /** article:section (article only) */
  section?: string;
}

/**
 * Per-route head tags: title, meta description, canonical, and Open Graph.
 * Overrides the static defaults in index.html for JS-executing crawlers.
 *
 * Dev guard: warn if meta description exceeds 160 characters (Google truncates ~155).
 */
export function PageSeo({
  title,
  description,
  path,
  type = "website",
  publishedTime,
  author,
  section,
}: PageSeoProps) {
  if (import.meta.env.DEV && description.length > 160) {
    // eslint-disable-next-line no-console
    console.warn(
      `[PageSeo] Meta description for ${path} is ${description.length} chars (>160). Google will truncate.`,
    );
  }

  const url = `${SITE_URL}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {type === "article" && publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {type === "article" && author && (
        <meta property="article:author" content={author} />
      )}
      {type === "article" && section && (
        <meta property="article:section" content={section} />
      )}
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
