import type { Lead } from "./types";

/** Deterministic PRNG for reproducible academic/demo datasets. */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SOURCES = [
  "google_ads",
  "meta_ads",
  "linkedin_ads",
  "web_form_home",
  "partner_webinar",
  "organic_search",
] as const;

const INDUSTRIES = ["technology", "finance", "healthcare", "manufacturing", "retail", "consumer"];

/** Plausible personas for UI stress tests (still fictional — not real people). */
const FIRST = [
  "Sarah",
  "James",
  "Priya",
  "Marcus",
  "Elena",
  "Daniel",
  "Amira",
  "Jordan",
  "Olivia",
  "Wei",
  "Thomas",
  "Nina",
  "Carlos",
  "Hannah",
  "Kwame",
  "Yuki",
  "Robert",
  "Fatima",
  "Lucas",
  "Grace",
  "Andre",
  "Mei",
  "David",
  "Sofia",
  "Ethan",
  "Aisha",
  "Ryan",
  "Camille",
  "Vikram",
  "Laura",
  "Noah",
  "Keiko",
] as const;

const LAST = [
  "Chen",
  "Okonkwo",
  "Patel",
  "Reyes",
  "Lindqvist",
  "Nakamura",
  "Hassan",
  "Park",
  "Martinez",
  "Foster",
  "Nguyen",
  "Kowalski",
  "Ibrahim",
  "Sullivan",
  "Bianchi",
  "Thompson",
  "Alvarez",
  "Kim",
  "Schmidt",
  "Tanaka",
  "Johnson",
  "Rossi",
  "Singh",
  "Berg",
  "Lopez",
  "Murphy",
  "Sharma",
  "Dubois",
  "Khan",
  "Yamamoto",
] as const;

const CO_PREFIX = [
  "Northwind",
  "Cedar",
  "Atlas",
  "BlueRiver",
  "Summit",
  "Harbor",
  "Meridian",
  "Granite",
  "Silverline",
  "Vertex",
  "Pioneer",
  "Cascade",
  "Ironwood",
  "Brightfield",
  "Quantum",
] as const;

const CO_SUFFIX = [
  "Labs",
  "Systems",
  "Partners",
  "Holdings",
  "Group",
  "Logistics",
  "Capital",
  "Technologies",
  "Solutions",
  "Industries",
] as const;

const TITLES = [
  "VP of Sales",
  "Director of Engineering",
  "Head of Growth",
  "CFO",
  "COO",
  "Director of IT",
  "VP Marketing",
  "Head of Procurement",
  "Chief Revenue Officer",
  "Director of Operations",
  "VP Business Development",
  "IT Director",
  "Managing Director",
  "Head of Finance",
] as const;

const AREA = ["212", "415", "617", "206", "404", "312", "214", "303", "650", "512"] as const;

function slugPart(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildPersona(
  i: number,
  rnd: () => number,
): { name: string; email: string; company: string; phone: string | null } {
  const fn = FIRST[i % FIRST.length]!;
  const ln = LAST[(i * 11 + 7) % LAST.length]!;
  const name = `${fn} ${ln}`;
  const pre = CO_PREFIX[(i * 3) % CO_PREFIX.length]!;
  const suf = CO_SUFFIX[(i * 5) % CO_SUFFIX.length]!;
  const company = `${pre} ${suf}`;
  const domainCore = `${slugPart(pre)}${slugPart(suf)}${i % 503}`.slice(0, 28);
  const domain = `${domainCore}.com`;
  const consumer = rnd() < 0.24;
  const email = consumer
    ? `${slugPart(fn)}.${slugPart(ln).slice(0, 9)}${i % 73}@${i % 3 === 0 ? "gmail.com" : i % 3 === 1 ? "outlook.com" : "yahoo.com"}`
    : `${fn.charAt(0).toLowerCase()}.${slugPart(ln)}@${domain}`;
  const phone =
    i % 6 === 0
      ? `+1 (${AREA[i % AREA.length]}) ${String(200 + (i % 799)).padStart(3, "0")}-${String(1000 + (i % 8999)).padStart(4, "0")}`
      : null;
  return { name, email, company, phone };
}

function mockUuid(i: number): string {
  const hex = i.toString(16).padStart(12, "0");
  return `00000000-0000-4000-8000-${hex.slice(0, 12)}`;
}

function isoMinutesAgo(rnd: () => number, i: number): string {
  const minutes = Math.floor(rnd() * 60 * 24 * 45) + i % 120;
  const d = new Date(Date.now() - minutes * 60 * 1000);
  return d.toISOString();
}

/**
 * Generates a large in-memory lead set to validate virtualization and filter performance.
 * Uses realistic-looking (but fictional) names/companies — toggle off in Settings to use your real API rows.
 */
export function generateMockLeads(count = 1200): Lead[] {
  const rnd = mulberry32(20260412);
  const out: Lead[] = [];
  for (let i = 0; i < count; i++) {
    const score = Math.floor(rnd() * 101);
    let tier: string | null = "cold";
    if (score >= 75) tier = "hot";
    else if (score >= 45) tier = "warm";
    const source = SOURCES[Math.floor(rnd() * SOURCES.length)]!;
    const industry = INDUSTRIES[Math.floor(rnd() * INDUSTRIES.length)]!;
    const created = isoMinutesAgo(rnd, i);
    const enriched = rnd() > 0.08 ? created : null;
    const hasOutreach = tier === "hot" && rnd() > 0.15;
    const firstOut = hasOutreach
      ? new Date(new Date(created).getTime() + (5000 + rnd() * 240000)).toISOString()
      : null;

    const persona = buildPersona(i, rnd);

    out.push({
      id: mockUuid(i),
      name: persona.name,
      email: persona.email,
      phone: persona.phone,
      company: persona.company,
      source,
      created_at: created,
      updated_at: created,
      assigned_to_id: null,
      job_title: TITLES[i % TITLES.length]!,
      industry,
      company_size_band: i % 2 === 0 ? "201-500" : "51-200",
      company_size_estimate: 120 + Math.floor(rnd() * 900),
      location_country: rnd() > 0.25 ? "US" : "GB",
      enrichment_provider: enriched ? "mock_heuristic" : null,
      enriched_at: enriched,
      fit_score: Math.min(100, score + Math.floor(rnd() * 11) - 5),
      intent_score: Math.min(100, Math.floor(rnd() * 40) + (tier === "hot" ? 30 : 0)),
      predictive_score: Math.min(100, Math.floor(rnd() * 35) + (tier === "hot" ? 40 : 10)),
      total_score: score,
      tier,
      fit_reason: `ICP alignment for ${industry} is ${score >= 60 ? "strong" : "moderate"} in this synthetic record.`,
      intent_reason: `Engagement mix includes synthetic touches weighted toward ${tier} classification.`,
      predictive_reason: `Logistic-style baseline suggests ${tier} propensity based on historical analogs.`,
      score_summary: `Composite ${score}/100 (${String(tier).toUpperCase()}).`,
      scored_at: enriched,
      first_outreach_at: firstOut,
      last_outreach_channel: firstOut ? "email" : null,
      authenticity_trust: rnd() > 0.1 ? "high" : "medium",
      bot_risk_score: Math.floor(rnd() * 40),
      notes: null,
    });
  }
  return out;
}

/** Shared pool for scalability experiments (virtualized UI, analytics lab). */
export const MOCK_LEAD_POOL = generateMockLeads(1200);
