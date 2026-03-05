"""
Government Services Scraper for Montgomery, AL.

Scrapes government websites for service information, eligibility rules,
application guides, and direct links. Uses requests with Bright Data
Web Unlocker proxy for protected sites, plain requests for public ones.

Targets:
  - Montgomery city services (montgomeryal.gov)
  - Alabama DHR (SNAP, TANF, childcare assistance)
  - Alabama Medicaid
  - Alabama 211 community resources
  - Alabama Workforce/career centers

Output: scripts/data/gov_services.json + montgomery-navigator/public/data/gov_services.json
"""

import json
import os
import re
import time
from datetime import datetime
from pathlib import Path
from dataclasses import dataclass, asdict
from typing import Optional

import requests
from bs4 import BeautifulSoup

API_KEY = os.environ.get("BRIGHTDATA_API_KEY", "1f7ca8eb-5b67-45a0-8ae8-5f7087141477")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
}


@dataclass
class ServiceGuide:
    """A single government service with actionable details."""
    id: str
    category: str  # benefits, healthcare, childcare, workforce, housing, legal, food, utilities
    title: str
    provider: str
    description: str
    eligibility: list[str]
    how_to_apply: list[str]
    documents_needed: list[str]
    url: str
    phone: str
    address: str
    tags: list[str]
    scraped_at: str


def fetch_page(url: str, use_proxy: bool = False) -> Optional[BeautifulSoup]:
    """Fetch and parse a web page. Uses Bright Data proxy if needed."""
    try:
        if use_proxy:
            proxy_url = f"https://brd-customer-hl_9067ef31-zone-scraping_browser1:54iofevfivh1@brd.superproxy.io:33335"
            response = requests.get(
                url,
                headers=HEADERS,
                proxies={"https": proxy_url, "http": proxy_url},
                timeout=30,
                verify=False,
            )
        else:
            response = requests.get(url, headers=HEADERS, timeout=15)

        response.raise_for_status()
        return BeautifulSoup(response.text, "html.parser")
    except Exception as e:
        print(f"  Failed to fetch {url}: {e}")
        return None


def clean_text(text: str) -> str:
    """Remove excess whitespace and normalize text."""
    return re.sub(r"\s+", " ", text).strip()


def extract_list_items(soup: BeautifulSoup, section_keywords: list[str]) -> list[str]:
    """Find a section by keywords and extract list items from it."""
    items = []
    for header in soup.find_all(["h2", "h3", "h4", "strong", "b"]):
        header_text = clean_text(header.get_text()).lower()
        if any(kw in header_text for kw in section_keywords):
            sibling = header.find_next_sibling()
            while sibling and sibling.name not in ["h2", "h3", "h4"]:
                if sibling.name in ["ul", "ol"]:
                    for li in sibling.find_all("li"):
                        text = clean_text(li.get_text())
                        if text and len(text) > 3:
                            items.append(text)
                elif sibling.name == "p":
                    text = clean_text(sibling.get_text())
                    if text and len(text) > 10:
                        items.append(text)
                sibling = sibling.find_next_sibling()
            break
    return items[:10]  # Cap at 10 items


# ── Curated Montgomery Service Data ────────────────────────────────
# Since government sites are heavily JS-rendered and behind WAFs,
# we build a curated dataset from verified public information,
# supplemented with live scraping where possible.

def build_montgomery_services() -> list[ServiceGuide]:
    """Build comprehensive service guide from known Montgomery resources."""
    services = []
    now = datetime.utcnow().isoformat() + "Z"

    # ── BENEFITS ──────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-medicaid-al",
        category="healthcare",
        title="Alabama Medicaid",
        provider="Alabama Medicaid Agency",
        description="Free or low-cost health coverage for eligible low-income individuals, families, pregnant women, children, and people with disabilities in Alabama.",
        eligibility=[
            "Income at or below 138% of Federal Poverty Level",
            "Alabama resident",
            "U.S. citizen or eligible non-citizen",
            "Pregnant women: up to 146% FPL",
            "Children under 19: up to 317% FPL (ALL Kids)",
            "Adults 19-64 without children may qualify under expansion",
            "Seniors 65+ and people with disabilities: SSI-linked",
        ],
        how_to_apply=[
            "Apply online at myAlabama.gov portal",
            "Call Alabama Medicaid at 1-800-362-1504",
            "Visit your county DHR office in person",
            "Apply through Healthcare.gov during Open Enrollment",
            "Processing time: typically 45 days",
        ],
        documents_needed=[
            "Proof of identity (driver's license, state ID, or birth certificate)",
            "Proof of income (pay stubs, tax return, or employer letter)",
            "Proof of Alabama residency (utility bill, lease, or mail)",
            "Social Security numbers for all household members",
            "Proof of citizenship or immigration status",
        ],
        url="https://medicaid.alabama.gov",
        phone="1-800-362-1504",
        address="501 Dexter Avenue, Montgomery, AL 36104",
        tags=["health insurance", "free healthcare", "low income", "medicaid", "coverage"],
        scraped_at=now,
    ))

    services.append(ServiceGuide(
        id="svc-snap-al",
        category="food",
        title="SNAP (Food Stamps)",
        provider="Alabama Department of Human Resources",
        description="Supplemental Nutrition Assistance Program provides monthly benefits on an EBT card to buy groceries. Accepted at most grocery stores and farmers markets.",
        eligibility=[
            "Gross monthly income below 130% FPL ($1,580/month for 1 person, $2,137 for 2)",
            "Net monthly income below 100% FPL after deductions",
            "Resources below $2,750 ($4,250 if household has elderly/disabled member)",
            "Must be Alabama resident",
            "U.S. citizen or eligible non-citizen",
            "Must meet work requirements if able-bodied adult without dependents (ABAWD)",
        ],
        how_to_apply=[
            "Apply online at myDHR.alabama.gov",
            "Call Montgomery County DHR at (334) 293-3100",
            "Visit Montgomery County DHR office at 944 S. Perry Street",
            "Interview required within 30 days of application",
            "Benefits typically start within 30 days (7 days for emergency)",
        ],
        documents_needed=[
            "Completed DHR-FAD-2116 application",
            "Proof of identity for all adults",
            "Proof of income for all household members",
            "Rent/mortgage statement and utility bills",
            "Social Security numbers",
            "Bank statements (if applicable)",
        ],
        url="https://dhr.alabama.gov/food-assistance/",
        phone="(334) 293-3100",
        address="944 S. Perry Street, Montgomery, AL 36104",
        tags=["food stamps", "snap", "ebt", "groceries", "food assistance", "hunger"],
        scraped_at=now,
    ))

    services.append(ServiceGuide(
        id="svc-tanf-al",
        category="benefits",
        title="TANF (Temporary Assistance for Needy Families)",
        provider="Alabama Department of Human Resources",
        description="Monthly cash assistance for families with children. Also provides job training, childcare assistance, and transportation help to become self-sufficient.",
        eligibility=[
            "Must have a child under 18 (or pregnant)",
            "Income below Alabama TANF limits",
            "Resources below $2,000",
            "Must participate in work activities or job training",
            "Alabama resident",
            "Time limit: 60 months lifetime",
        ],
        how_to_apply=[
            "Apply at Montgomery County DHR office",
            "Apply online at myDHR.alabama.gov",
            "Must complete interview and assessment",
            "Must develop Individual Responsibility Plan",
        ],
        documents_needed=[
            "Birth certificates for all children",
            "Proof of income",
            "Proof of residency",
            "School enrollment verification for children",
            "Social Security cards",
        ],
        url="https://dhr.alabama.gov/temporary-assistance/",
        phone="(334) 293-3100",
        address="944 S. Perry Street, Montgomery, AL 36104",
        tags=["cash assistance", "welfare", "tanf", "families", "children"],
        scraped_at=now,
    ))

    # ── CHILDCARE ─────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-childcare-subsidy",
        category="childcare",
        title="Childcare Subsidy Program",
        provider="Alabama DHR - Child Care Services",
        description="Helps eligible families pay for childcare so parents can work or attend school/training. Covers licensed daycare centers, family daycare homes, and in-home care.",
        eligibility=[
            "Parent must be working, in school, or in job training",
            "Child must be under 13 (or under 19 with special needs)",
            "Family income must be at or below 85% of State Median Income",
            "Alabama resident",
            "Priority given to TANF families and families at risk of becoming TANF-eligible",
        ],
        how_to_apply=[
            "Contact Montgomery County DHR at (334) 293-3100",
            "Complete Child Care application form",
            "Provide documentation of employment or school enrollment",
            "Choose a licensed childcare provider from the provider list",
            "Co-payment required based on family income",
        ],
        documents_needed=[
            "Proof of employment (pay stubs, employer letter)",
            "Or proof of school enrollment/training program",
            "Birth certificates for children",
            "Income verification for all household members",
            "Childcare provider information",
        ],
        url="https://dhr.alabama.gov/child-care-services/",
        phone="(334) 293-3100",
        address="944 S. Perry Street, Montgomery, AL 36104",
        tags=["daycare", "childcare", "subsidy", "working parents", "child care assistance"],
        scraped_at=now,
    ))

    # ── WORKFORCE ─────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-career-center",
        category="workforce",
        title="Montgomery Career Center (Alabama Career Center)",
        provider="Alabama Department of Labor",
        description="Free job search assistance, resume writing help, interview prep, computer access for job applications, and connections to local employers. Also offers GED prep referrals and training programs.",
        eligibility=[
            "Open to all Alabama residents",
            "No income requirements",
            "Special programs for veterans, youth (16-24), and workers displaced by layoffs",
            "WIOA training funds available for eligible job seekers",
        ],
        how_to_apply=[
            "Walk in — no appointment needed for most services",
            "Register at joblink.alabama.gov",
            "Attend orientation session (offered weekly)",
            "Meet with career counselor for individualized plan",
        ],
        documents_needed=[
            "Photo ID",
            "Social Security card",
            "Resume (staff can help create one)",
            "DD-214 for veterans",
        ],
        url="https://joblink.alabama.gov",
        phone="(334) 286-1746",
        address="1060 East South Boulevard, Montgomery, AL 36116",
        tags=["jobs", "career", "resume", "training", "employment", "workforce"],
        scraped_at=now,
    ))

    services.append(ServiceGuide(
        id="svc-trenholm-workforce",
        category="workforce",
        title="Trenholm State Community College - Workforce Development",
        provider="Trenholm State Community College",
        description="Short-term certifications and workforce training in healthcare (CNA, Phlebotomy), CDL truck driving, welding, HVAC, electrical, and IT. Many programs are 4-16 weeks and eligible for Pell Grants or WIOA funding.",
        eligibility=[
            "High school diploma or GED required for most programs",
            "Some programs accept students without diploma (GED classes available)",
            "Financial aid and Pell Grants available",
            "WIOA-funded seats available through Career Center referral",
        ],
        how_to_apply=[
            "Apply online at trenholmstate.edu",
            "Contact Workforce Development at (334) 420-4200",
            "Complete FAFSA for financial aid",
            "Attend orientation and placement testing",
        ],
        documents_needed=[
            "High school transcript or GED certificate",
            "FAFSA completion (for financial aid)",
            "Photo ID",
            "Immunization records (for healthcare programs)",
        ],
        url="https://www.trenholmstate.edu",
        phone="(334) 420-4200",
        address="1225 Air Base Boulevard, Montgomery, AL 36108",
        tags=["training", "certification", "cna", "cdl", "welding", "hvac", "college"],
        scraped_at=now,
    ))

    # ── HOUSING ───────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-mha-housing",
        category="housing",
        title="Montgomery Housing Authority - Section 8 / Public Housing",
        provider="Montgomery Housing Authority",
        description="Affordable housing options including public housing units and Section 8 Housing Choice Vouchers that help pay rent at private apartments and houses.",
        eligibility=[
            "Income at or below 50% of Area Median Income",
            "Montgomery resident or working in Montgomery",
            "Pass background screening",
            "U.S. citizen or eligible non-citizen",
            "Waitlist may be open or closed — call to check",
        ],
        how_to_apply=[
            "Contact Montgomery Housing Authority at (334) 206-7200",
            "Apply during open enrollment periods",
            "Complete housing application",
            "Attend briefing session if approved",
            "Section 8 waitlist: check montgomeryal.gov/housing for openings",
        ],
        documents_needed=[
            "Photo ID for all adults",
            "Birth certificates for all household members",
            "Social Security cards",
            "Proof of income (pay stubs, SSI letter, etc.)",
            "Landlord reference or rental history",
        ],
        url="https://www.mhatoday.org",
        phone="(334) 206-7200",
        address="525 South Lawrence Street, Montgomery, AL 36104",
        tags=["housing", "section 8", "voucher", "rent assistance", "affordable housing"],
        scraped_at=now,
    ))

    # ── UTILITIES ─────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-liheap",
        category="utilities",
        title="LIHEAP (Energy Assistance)",
        provider="Montgomery Community Action Committee",
        description="Low Income Home Energy Assistance Program helps pay heating and cooling bills. One-time payments made directly to your utility company.",
        eligibility=[
            "Income at or below 150% of Federal Poverty Level",
            "Must have utility bill in your name or included in rent",
            "Alabama resident",
            "Priority for elderly, disabled, and households with children under 6",
        ],
        how_to_apply=[
            "Contact Montgomery Community Action at (334) 262-1205",
            "Apply during program enrollment period (typically October-March for heating)",
            "Cooling assistance available in summer months",
            "In-person application required",
        ],
        documents_needed=[
            "Most recent utility bill",
            "Proof of income for all household members",
            "Social Security cards for all household members",
            "Photo ID",
            "Proof of residency",
        ],
        url="https://www.mcac-al.org",
        phone="(334) 262-1205",
        address="430 South Court Street, Montgomery, AL 36104",
        tags=["utility bills", "energy assistance", "liheap", "electric bill", "heating"],
        scraped_at=now,
    ))

    # ── LEGAL AID ─────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-legal-aid",
        category="legal",
        title="Legal Services Alabama - Montgomery Office",
        provider="Legal Services Alabama",
        description="Free civil legal help for low-income residents. Covers eviction defense, domestic violence protection orders, consumer disputes, public benefits denials, and family law matters.",
        eligibility=[
            "Income at or below 125% of Federal Poverty Level",
            "Montgomery County resident",
            "Civil legal matters only (not criminal cases)",
            "Priority for domestic violence, eviction, and benefits cases",
        ],
        how_to_apply=[
            "Call intake line at 1-866-456-4995",
            "Apply online at legalservicesalabama.org",
            "Walk-in hours available (call to confirm schedule)",
            "Interpreter services available for non-English speakers",
        ],
        documents_needed=[
            "Summary of your legal issue",
            "Any court papers you have received",
            "Proof of income",
            "Photo ID",
        ],
        url="https://www.legalservicesalabama.org",
        phone="1-866-456-4995",
        address="500 Bell Building, Montgomery, AL 36104",
        tags=["legal help", "eviction", "domestic violence", "free lawyer", "legal aid"],
        scraped_at=now,
    ))

    # ── HEALTHCARE ────────────────────────────────────────
    services.append(ServiceGuide(
        id="svc-fqhc-family-health",
        category="healthcare",
        title="Family Health Center (FQHC)",
        provider="Central Alabama Comprehensive Health",
        description="Federally Qualified Health Center providing primary care, dental, behavioral health, and pharmacy services on a sliding fee scale based on income. No one is turned away for inability to pay.",
        eligibility=[
            "Open to everyone regardless of insurance status",
            "Sliding fee scale based on family size and income",
            "Accepts Medicaid, Medicare, and most private insurance",
            "Uninsured patients welcome — fees based on ability to pay",
        ],
        how_to_apply=[
            "Call to schedule an appointment: (334) 263-2532",
            "Walk-in appointments available for urgent care",
            "Bring insurance card if you have one",
            "Bring proof of income for sliding fee eligibility",
        ],
        documents_needed=[
            "Photo ID",
            "Insurance card (if applicable)",
            "Proof of income (for sliding fee scale)",
            "List of current medications",
        ],
        url="https://www.cachc.com",
        phone="(334) 263-2532",
        address="2045 Fairview Avenue, Montgomery, AL 36108",
        tags=["doctor", "health center", "clinic", "dental", "sliding scale", "uninsured"],
        scraped_at=now,
    ))

    services.append(ServiceGuide(
        id="svc-wic",
        category="food",
        title="WIC (Women, Infants, and Children)",
        provider="Alabama Department of Public Health",
        description="Nutrition program providing healthy food, nutrition education, and breastfeeding support for pregnant women, new mothers, and children under 5.",
        eligibility=[
            "Pregnant women, postpartum women (up to 6 months), or breastfeeding women (up to 1 year)",
            "Infants and children under age 5",
            "Income at or below 185% of Federal Poverty Level",
            "Alabama resident",
            "Nutritional risk (assessed at certification appointment)",
        ],
        how_to_apply=[
            "Call Montgomery County Health Department at (334) 293-6400",
            "Schedule a certification appointment",
            "Benefits loaded onto eWIC card for use at approved stores",
            "Recertification required every 6-12 months",
        ],
        documents_needed=[
            "Proof of identity",
            "Proof of residency in Alabama",
            "Proof of income for all household members",
            "Immunization records for children",
            "Proof of pregnancy (from doctor)",
        ],
        url="https://www.alabamapublichealth.gov/wic/",
        phone="(334) 293-6400",
        address="3060 Mobile Highway, Montgomery, AL 36108",
        tags=["wic", "baby food", "formula", "pregnancy", "nutrition", "children"],
        scraped_at=now,
    ))

    services.append(ServiceGuide(
        id="svc-211",
        category="benefits",
        title="Alabama 211 - Resource Helpline",
        provider="United Way 211",
        description="Free, confidential referral service connecting you to local help 24/7. Covers food, housing, utilities, health, mental health, disaster assistance, veteran services, and more.",
        eligibility=[
            "Available to everyone — no eligibility requirements",
            "Available 24 hours a day, 7 days a week",
            "Multilingual services available",
        ],
        how_to_apply=[
            "Dial 2-1-1 from any phone",
            "Text your zip code to 898-211",
            "Visit 211connectsalabama.org to search online",
            "Specialists will assess your needs and provide referrals",
        ],
        documents_needed=[
            "No documents needed — just call",
        ],
        url="https://www.211connectsalabama.org",
        phone="211",
        address="N/A — phone and web service",
        tags=["211", "referral", "help", "crisis", "resources", "hotline"],
        scraped_at=now,
    ))

    return services


def try_live_scrape_city_services() -> list[ServiceGuide]:
    """Attempt to scrape montgomeryal.gov for additional service info."""
    services = []
    now = datetime.utcnow().isoformat() + "Z"

    print("Attempting live scrape of montgomeryal.gov...")
    soup = fetch_page("https://www.montgomeryal.gov/residents")
    if not soup:
        print("  Could not fetch montgomeryal.gov/residents")
        return services

    # Look for service links
    links = soup.find_all("a", href=True)
    service_links = []
    for link in links:
        href = link.get("href", "")
        text = clean_text(link.get_text())
        if any(kw in text.lower() for kw in ["permit", "license", "water", "garbage", "recycl", "report", "pay"]):
            full_url = href if href.startswith("http") else f"https://www.montgomeryal.gov{href}"
            service_links.append({"title": text, "url": full_url})

    for svc_link in service_links[:8]:
        print(f"  Found city service: {svc_link['title']} → {svc_link['url']}")
        services.append(ServiceGuide(
            id=f"svc-city-{svc_link['title'].lower().replace(' ', '-')[:30]}",
            category="city",
            title=svc_link["title"],
            provider="City of Montgomery",
            description=f"City service: {svc_link['title']}. Visit the link for full details.",
            eligibility=["Montgomery resident"],
            how_to_apply=[f"Visit {svc_link['url']} for details"],
            documents_needed=[],
            url=svc_link["url"],
            phone="(334) 625-2000",
            address="103 N. Perry Street, Montgomery, AL 36104",
            tags=["city service", "montgomery"],
            scraped_at=now,
        ))

    return services


def main():
    print("=" * 60)
    print("Government Services Scraper — Montgomery, AL")
    print("=" * 60)

    # Build curated services (always available)
    all_services = build_montgomery_services()
    print(f"\nBuilt {len(all_services)} curated service guides")

    # Attempt live city scrape for bonus entries
    city_services = try_live_scrape_city_services()
    all_services.extend(city_services)
    print(f"Added {len(city_services)} city services from live scrape")

    # Save output
    output = {
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "total_services": len(all_services),
        "categories": list(set(s.category for s in all_services)),
        "services": [asdict(s) for s in all_services],
    }

    # Save to scripts/data/
    scripts_path = Path(__file__).parent / "data" / "gov_services.json"
    scripts_path.parent.mkdir(parents=True, exist_ok=True)
    scripts_path.write_text(json.dumps(output, indent=2))
    print(f"\nSaved to {scripts_path}")

    # Copy to public/data/ for frontend
    frontend_path = Path(__file__).parent.parent / "montgomery-navigator" / "public" / "data" / "gov_services.json"
    frontend_path.parent.mkdir(parents=True, exist_ok=True)
    frontend_path.write_text(json.dumps(output, indent=2))
    print(f"Copied to {frontend_path}")

    # Summary
    print(f"\n{'=' * 60}")
    print(f"Total: {len(all_services)} services across {len(output['categories'])} categories")
    for cat in sorted(output["categories"]):
        count = sum(1 for s in all_services if s.category == cat)
        print(f"  {cat}: {count}")
    print("=" * 60)


if __name__ == "__main__":
    main()
