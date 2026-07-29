/** Probe /llms.txt result — shared across processes. */
export interface LlmsTxtProbe {
  url: string;
  found: boolean;
  statusCode: number;
  bytes: number;
  preview: string | null;
}
