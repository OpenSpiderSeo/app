/** SERP + social share preview payloads from crawled page fields. */
export interface PagePreviewData {
  url: string;
  domain: string;
  serpTitle: string;
  serpDescription: string;
  socialTitle: string;
  socialDescription: string;
  /** Resolved absolute URL for share card (og:image, else twitter:image). */
  socialImage: string | null;
  /** Resolved og:image only, if present. */
  ogImage: string | null;
  /** Resolved twitter:image only, if present. */
  twitterImage: string | null;
}
