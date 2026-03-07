import type { ChatMessage } from "./types";

export type { ChatMessage };

export function getDemoResponse(userMessage: string): ChatMessage {
  const lower = userMessage.toLowerCase();

  if (
    lower.includes("job") ||
    lower.includes("$15") ||
    lower.includes("amazon") ||
    lower.includes("take this") ||
    lower.includes("should i take") ||
    lower.includes("offer")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "I ran the full picture for you. Here's what this job actually means for your household:\n\n- **Net income change** after benefits adjustment\n- **Healthcare gap** analysis during transition\n- **Childcare impact** on your take-home pay\n\nLet's walk through each one so you can make the best decision.",
      type: "benefits-cliff",
      chips: ["What bridge programs help?", "How do I negotiate $18/hr?", "Walk me through applying"],
      flowMeta: {
        flowId: "U1",
        flowName: "Benefits Cliff Crossroads",
        currentStep: 3,
        totalSteps: 6,
        stepName: "Net income calculation",
      },
      profileData: {
        zip: "36104",
        householdSize: 4,
        income: 890,
        benefits: ["SNAP", "Medicaid", "LIHEAP"],
        children: 3,
      },
      actionItems: [
        { id: "u1-1", timeframe: "this_week", label: "Review cliff analysis with navigator", completed: false },
        { id: "u1-2", timeframe: "this_week", label: "Ask employer about health insurance start date", completed: false },
        { id: "u1-3", timeframe: "this_month", label: "Apply for Transitional SNAP", completed: false },
        { id: "u1-4", timeframe: "this_month", label: "File CHIP application for children", completed: false },
      ],
    };
  }

  if (
    lower.includes("medicaid") ||
    lower.includes("lost my") ||
    lower.includes("coverage") ||
    lower.includes("insurance")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Here are your **immediate options** for healthcare coverage:\n\n- **CHIP** — covers children under 19 in your household\n- **QMB (Medicare Savings)** — helps pay Medicare premiums & copays\n- **Sliding-scale clinics** — low-cost visits based on income\n\nI recommend starting with CHIP this week since it has the fastest turnaround.",
      type: "medicaid",
      chips: ["Tell me more about QMB", "Help me apply for CHIP", "Find sliding-scale clinics near me"],
      flowMeta: {
        flowId: "U2",
        flowName: "Medicaid Loss + Career Reset",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Emergency coverage scan",
      },
      profileData: {
        benefits: ["Medicaid (lost)"],
      },
      actionItems: [
        { id: "u2-1", timeframe: "this_week", label: "File CHIP application for children", completed: false },
        { id: "u2-2", timeframe: "this_week", label: "Apply for QMB (Medicare Savings Program)", completed: false },
        { id: "u2-3", timeframe: "this_month", label: "Apply to at least 3 jobs with employer insurance", completed: false },
      ],
    };
  }

  if (
    lower.includes("plant") ||
    lower.includes("earn more") ||
    lower.includes("career") ||
    lower.includes("promotion") ||
    lower.includes("skills") ||
    lower.includes("better job") ||
    lower.includes("want more") ||
    lower.includes("ladder") ||
    lower.includes("find better")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Based on your experience, here's a path to **higher-paying roles**:\n\n1. **Quality Control Cert** — 6-week AIDT program, free for AL residents\n2. **Line Lead position** — $18-22/hr, your current plant is hiring\n3. **WIOA funding** — covers training costs + provides a stipend\n\nThe fastest move is registering for the next AIDT orientation session.",
      type: "skill-gap",
      chips: ["Walk me through WIOA application", "Tell me about AIDT programs"],
      flowMeta: {
        flowId: "U3",
        flowName: "Assembly Line Ladder",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Skill gap analysis",
      },
      profileData: {
        income: 1250,
      },
      actionItems: [
        { id: "u3-1", timeframe: "this_week", label: "Register for AIDT orientation session", completed: false },
        { id: "u3-2", timeframe: "this_month", label: "Enroll in Quality Control certification", completed: false },
        { id: "u3-3", timeframe: "this_month", label: "Apply for Line Lead posting at current plant", completed: false },
      ],
    };
  }

  if (
    lower.includes("reentry") ||
    lower.includes("record") ||
    lower.includes("conviction") ||
    lower.includes("rebuild") ||
    lower.includes("got out") ||
    lower.includes("rebuilding") ||
    lower.includes("returning") ||
    lower.includes("released")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Welcome back — here's what's available to you in Montgomery:\n\n- **Healthcare**: Apply for Medicaid at the DHR office on S. Ripley St.\n- **Employment**: AIDT has a reentry orientation with job placement\n- **Legal**: File a Certificate of Relief to expand job eligibility\n- **Reentry-friendly employers**: 12 local companies actively hiring\n\nLet's start with the most urgent need first.",
      type: "reentry",
      chips: ["Help me apply for Medicaid now", "Which employers hire returning citizens?"],
      flowMeta: {
        flowId: "U6",
        flowName: "Returning Citizen Reentry",
        currentStep: 2,
        totalSteps: 6,
        stepName: "Alabama-specific eligibility",
      },
      actionItems: [
        { id: "u6-1", timeframe: "this_week", label: "Apply for Medicaid at DHR office", completed: false },
        { id: "u6-2", timeframe: "this_week", label: "Attend AIDT reentry orientation", completed: false },
        { id: "u6-3", timeframe: "this_month", label: "Apply to reentry-friendly employers list", completed: false },
        { id: "u6-4", timeframe: "this_month", label: "File Certificate of Relief petition", completed: false },
      ],
    };
  }

  if (
    lower.includes("benefits") ||
    lower.includes("check my") ||
    lower.includes("eligible") ||
    lower.includes("snap") ||
    lower.includes("qualify")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Based on your profile, you may qualify for:\n\n- **SNAP** — food assistance ($680/mo for household of 4)\n- **Medicaid** — full healthcare coverage\n- **LIHEAP** — utility bill assistance (up to $600/yr)\n- **DHR Childcare** — subsidized childcare for working parents\n\nI've prepared a full eligibility report below.",
      type: "pdf-preview",
      chips: ["Download my full report", "What should I apply for first?"],
      flowMeta: {
        flowId: "U5",
        flowName: "New to Montgomery",
        currentStep: 2,
        totalSteps: 5,
        stepName: "Benefits discovery scan",
      },
      profileData: {
        benefits: ["eligible"],
      },
      actionItems: [
        { id: "u5-1", timeframe: "this_week", label: "Apply for SNAP at DHR", completed: false },
        { id: "u5-2", timeframe: "this_week", label: "Verify Medicaid eligibility", completed: false },
        { id: "u5-3", timeframe: "this_month", label: "Register on AlabamaWorks job portal", completed: false },
      ],
    };
  }

  if (
    lower.includes("single") ||
    lower.includes("parent") ||
    lower.includes("childcare") ||
    lower.includes("kids") ||
    lower.includes("income")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Here are **cliff-safe jobs** that work for single parents in Montgomery:\n\n- **Baptist Health** — Medical Assistant, $16/hr + full benefits\n- **MGMW** — Customer Service, $15/hr + childcare stipend\n- **Hyundai** — Assembly (evening shift), $19/hr + overtime\n\nAll three keep you **above the benefits cliff** so you won't lose SNAP or Medicaid.",
      type: "job-card",
      chips: ["Show me the cliff analysis", "What childcare help is available?", "Are there evening shift jobs?"],
      flowMeta: {
        flowId: "U4",
        flowName: "Single Parent Financial Reset",
        currentStep: 3,
        totalSteps: 6,
        stepName: "Cliff-safe job search",
      },
      profileData: {
        householdSize: 4,
        income: 890,
        benefits: ["SNAP", "Medicaid", "DHR Childcare"],
        children: 3,
      },
      actionItems: [
        { id: "u4-1", timeframe: "this_week", label: "Review cliff-safe job list with navigator", completed: false },
        { id: "u4-2", timeframe: "this_week", label: "Request DHR childcare subsidy review", completed: false },
        { id: "u4-3", timeframe: "this_month", label: "Apply to employer with benefits above cliff threshold", completed: false },
      ],
    };
  }

  if (lower.includes("health") || lower.includes("clinic") || lower.includes("doctor") || lower.includes("dental")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Here are **health clinics** near you in Montgomery:\n\n- **Family Health Center** — 2045 Fairview Ave\n  - Walk-ins accepted, sliding-scale fees\n  - Phone: (334) 272-7902\n- **Baptist Health Clinic** — 301 Brown Springs Rd\n  - Primary care + dental, accepts Medicaid\n  - Phone: (334) 273-4400\n- **Central Alabama Veterans** — 215 Perry Hill Rd\n  - Veterans only, no copay for service-connected\n  - Phone: (334) 272-4670\n\nWould you like me to show these on the map?",
      type: "text",
      chips: ["Show on map", "Which accept walk-ins?", "Find dental clinics"],
    };
  }

  if (lower.includes("form") || lower.includes("help with") || lower.includes("apply") || lower.includes("document")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "I can walk you through any application **step by step**. Which program are you applying for?\n\n- **SNAP** — food assistance\n- **Medicaid** — healthcare coverage\n- **CHIP** — children's health insurance\n- **LIHEAP** — utility bill help\n- **WIOA** — job training funding\n\nJust pick one and I'll guide you through it.",
      type: "text",
      chips: ["SNAP application", "Medicaid renewal", "WIOA training funding"],
    };
  }

  if (lower.includes("new to montgomery") || lower.includes("moved") || lower.includes("new to")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "**Welcome to Montgomery!** Here's what I can help you with right away:\n\n1. **Find a job** — local openings matched to your skills\n2. **Check benefits** — see what programs you qualify for\n3. **City services** — connect to transit, utilities, and more\n4. **Healthcare** — find clinics and coverage options\n\nWhat's your most pressing need?",
      type: "text",
      chips: ["I need a job", "Where do I sign up for benefits?", "Healthcare options"],
      flowMeta: {
        flowId: "U5",
        flowName: "New to Montgomery",
        currentStep: 1,
        totalSteps: 5,
        stepName: "Geographic orientation",
      },
    };
  }

  if (lower.includes("bridge") || lower.includes("negotiate") || lower.includes("walk me through") || lower.includes("transition")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Alabama has several **bridge programs** to protect you during the transition:\n\n- **Transitional Medicaid** — extends coverage for up to 12 months after you start working\n- **SNAP Transitional Benefits** — 5 extra months of food assistance\n- **DHR Childcare Subsidy** — continues through the transition period\n\nThese ensure you don't lose ground while your income increases. Want me to walk you through applying for any of these?",
      type: "text",
      chips: ["Apply for Transitional Medicaid", "Tell me about SNAP transition", "Check my childcare subsidy"],
    };
  }

  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I'm here to help! Tell me a bit about what you need, and I'll find the right resources for you in Montgomery.\n\nHere are some things I can help with:",
    type: "text",
    chips: [
      "I just got a job offer — will I lose my benefits?",
      "I lost my Medicaid — what do I do?",
      "I want to earn more — how do I move up?",
      "I'm a single parent juggling work and kids",
      "I'm new to Montgomery and need to get started",
      "I'm rebuilding after release — where do I begin?",
    ],
  };
}
