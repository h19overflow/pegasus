/**
 * Job matching engine: compares user CV skills against job requirements.
 * Separates actual skills from requirements (clearance, physical, experience).
 */
import type { CvData, JobListing, JobMatch, JobSkills, TrendingSkill } from "./types";

/** Categories that represent actual learnable/marketable skills */
const SKILL_CATEGORIES = new Set(["technical", "healthcare", "soft_skills", "education"]);

/** Categories that are job requirements, not skills to develop */
const REQUIREMENT_CATEGORIES = new Set(["clearance", "physical", "experience"]);

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim();
}

/** Healthcare-specific skills that should only match healthcare-titled jobs */
const HEALTHCARE_ONLY_SKILLS = new Set(["rn", "lpn", "cna", "emt", "cpr", "phlebotomy", "nursing", "patient care", "clinical"]);

const HEALTHCARE_TITLE_PATTERNS = /nurse|nurs|rn\b|lpn|cna|medical|health|hospital|clinic|care\b|pharm|emt|paramedic|dental|therapy|therapist/i;

/**
 * Checks if a job genuinely requires a specific skill.
 * Guards against false positives from the skill extraction pipeline
 * (e.g., "rn" extracted from "learn"/"return" in non-healthcare jobs).
 */
export function jobMatchesSkillFilter(job: JobListing, rawSkillKey: string): boolean {
  const skillInSummary = job.skillSummary.toLowerCase().includes(rawSkillKey);
  if (!skillInSummary) return false;

  if (HEALTHCARE_ONLY_SKILLS.has(rawSkillKey)) {
    return HEALTHCARE_TITLE_PATTERNS.test(job.title);
  }

  return true;
}

/** Pretty-print skill names for display */
const DISPLAY_NAMES: Record<string, string> = {
  "cdl": "CDL License",
  "hvac": "HVAC",
  "cna": "CNA Certification",
  "rn": "Registered Nurse (RN)",
  "lpn": "LPN",
  "cpr": "CPR Certified",
  "emt": "EMT",
  "cnc": "CNC Operation",
  "autocad": "AutoCAD",
  "sql": "SQL",
  "python": "Python",
  "ged": "GED",
  "microsoft office": "Microsoft Office",
  "excel": "Excel",
  "data entry": "Data Entry",
  "customer service": "Customer Service",
  "problem solving": "Problem Solving",
  "time management": "Time Management",
  "detail oriented": "Attention to Detail",
  "patient care": "Patient Care",
  "first aid": "First Aid",
  "phlebotomy": "Phlebotomy",
  "pharmacy": "Pharmacy",
  "clinical": "Clinical Experience",
  "nursing": "Nursing",
  "leadership": "Leadership",
  "teamwork": "Teamwork",
  "communication": "Communication",
  "organizational": "Organization",
  "forklift": "Forklift Operation",
  "welding": "Welding",
  "electrical": "Electrical",
  "plumbing": "Plumbing",
  "mechanical": "Mechanical",
  "computer": "Computer Skills",
  "software": "Software",
  "programming": "Programming",
};

function displayName(skill: string): string {
  return DISPLAY_NAMES[skill] ?? skill.charAt(0).toUpperCase() + skill.slice(1);
}

function flattenSkillCategories(skills: JobSkills): string[] {
  const all: string[] = [];
  for (const [category, keywords] of Object.entries(skills)) {
    if (!SKILL_CATEGORIES.has(category) || !Array.isArray(keywords)) continue;
    all.push(...keywords);
  }
  return [...new Set(all.map(normalizeSkill))];
}

function normalizeCvSkills(cvSkills: string[]): string[] {
  const expanded: string[] = [];
  for (const skill of cvSkills) {
    const lower = normalizeSkill(skill);
    expanded.push(lower);

    const expansions: Record<string, string[]> = {
      "customer service": ["customer service"],
      "inventory management": ["warehouse", "inventory"],
      "team leadership": ["leadership", "teamwork"],
      "cash handling": ["cash handling"],
      "safety protocols": ["safety"],
      "forklift certified": ["forklift"],
      "microsoft office": ["microsoft office", "excel", "computer"],
      "bilingual: en/es": ["communication"],
      "data entry": ["data entry"],
      "cdl": ["cdl"],
      "cna": ["cna"],
      "rn": ["rn", "nursing"],
      "hvac": ["hvac"],
      "welding": ["welding"],
      "electrical": ["electrical"],
      "plumbing": ["plumbing"],
      "python": ["python", "programming"],
      "sql": ["sql"],
    };

    const matchingExpansions = expansions[lower];
    if (matchingExpansions) {
      expanded.push(...matchingExpansions);
    }
  }

  return [...new Set(expanded)];
}

export function matchJobsToProfile(
  jobs: JobListing[],
  cvData: CvData,
): JobMatch[] {
  const userSkills = normalizeCvSkills(cvData.skills);

  const matches: JobMatch[] = jobs.map((job) => {
    const requiredSkills = flattenSkillCategories(job.skills);

    const matched = requiredSkills.filter((skill) =>
      userSkills.some((us) => us.includes(skill) || skill.includes(us))
    );
    const missing = requiredSkills.filter(
      (skill) => !userSkills.some((us) => us.includes(skill) || skill.includes(us))
    );

    const matchPercent = requiredSkills.length > 0
      ? Math.round((matched.length / requiredSkills.length) * 100)
      : 0;

    return {
      ...job,
      matchPercent,
      matchedSkills: matched.map(displayName),
      missingSkills: missing.map(displayName),
    };
  });

  return matches.sort((a, b) => b.matchPercent - a.matchPercent);
}

export function computeTrendingSkills(jobs: JobListing[]): TrendingSkill[] {
  const skillCounts: Record<string, { rawKey: string; category: string; count: number }> = {};

  for (const job of jobs) {
    for (const [category, keywords] of Object.entries(job.skills)) {
      if (!SKILL_CATEGORIES.has(category) || !Array.isArray(keywords)) continue;

      for (const keyword of keywords) {
        const key = normalizeSkill(keyword);
        if (HEALTHCARE_ONLY_SKILLS.has(key) && !HEALTHCARE_TITLE_PATTERNS.test(job.title)) continue;
        const display = displayName(key);
        if (!skillCounts[display]) {
          skillCounts[display] = { rawKey: key, category, count: 0 };
        }
        skillCounts[display].count++;
      }
    }
  }

  const total = jobs.length || 1;
  return Object.entries(skillCounts)
    .map(([name, { rawKey, category, count }]) => ({
      name,
      rawKey,
      category,
      count,
      percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}
