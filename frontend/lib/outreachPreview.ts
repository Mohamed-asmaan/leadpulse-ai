import type { Lead } from "./types";

/** Mirrors backend personalization logic for instant preview when logs are empty. */
export function buildOutreachPreview(lead: Lead): { channel: "email"; subject: string; body: string } {
  const fn = lead.name.trim().split(/\s+/)[0] || "there";
  const industry = (lead.industry || "your market").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = lead.job_title || "team leader";
  const company = lead.company || "your organization";
  const subject = `${fn}, faster follow-ups for ${industry} teams`;
  const body =
    `Hi ${fn},\n\n` +
    `Given your role as ${title} at ${company}, LeadPulse AI removes the response gap that hurts conversions in ${industry}. ` +
    `If you want replies in seconds instead of days, reply YES and we’ll share a 2-minute walkthrough.\n\n` +
    `— LeadPulse AI`;
  return { channel: "email", subject, body };
}
