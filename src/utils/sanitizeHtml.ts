import DOMPurify from "isomorphic-dompurify";

const sanitizeConfig = {
  USE_PROFILES: { html: true }
};

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, sanitizeConfig);
}
