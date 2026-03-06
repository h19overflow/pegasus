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
      content: "I ran the full picture for you. Here's what this job actually means for your household:",
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
      content: "",
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
      content: "",
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
      content: "",
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
      content: "Based on what you've told me, here's a summary of programs you may qualify for:",
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
      content: "I understand — let me look at the full picture for you. Here are some jobs with benefits that could work for a single parent in Montgomery:",
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

  if (lower.includes("form") || lower.includes("help with") || lower.includes("apply") || lower.includes("document")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "I can walk you through any application form step by step. Which program are you trying to apply for? I know the forms for SNAP, Medicaid, CHIP, LIHEAP, WIOA training assistance, and City of Montgomery services.",
      type: "text",
      chips: ["SNAP application", "Medicaid renewal", "WIOA training funding"],
    };
  }

  if (lower.includes("new to montgomery") || lower.includes("moved") || lower.includes("new to")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Welcome to Montgomery! Let me help you get settled. Here's what I can help with right away: finding a job, checking benefit eligibility, connecting to city services, and navigating healthcare options. What's your most pressing need?",
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
      content: "Great question. Alabama has several bridge programs that help you transition off benefits without losing ground. The Transitional Medicaid program extends your coverage for up to 12 months after you start working. Alabama's SNAP transitional benefits give you 5 extra months. And DHR childcare subsidies continue through the transition period. I can walk you through each one.",
      type: "text",
      chips: ["Apply for Transitional Medicaid", "Tell me about SNAP transition", "Check my childcare subsidy"],
    };
  }

  // ==== NEW ROADMAP INTEGRATION ====
  if (lower.includes("list the services") || lower.includes("list services") || lower.includes("what services")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content: "Here are some of the key services I can help you build a step-by-step roadmap for:",
      type: "text",
      chips: [
        "Roadmap for SNAP", 
        "Roadmap for Medicaid", 
        "Roadmap for Childcare Subsidy", 
        "Roadmap for LIHEAP",
        "Roadmap for Section 8 Housing"
      ],
    };
  }

  if (lower.includes("roadmap of") || lower.includes("roadmap for") || lower.includes("build a roadmap")) {
    let serviceId = "svc-snap-al"; // Default
    let serviceTitle = "SNAP (Food Stamps)";

    if (lower.includes("medicaid")) {
      serviceId = "svc-medicaid-al";
      serviceTitle = "Alabama Medicaid";
    } else if (lower.includes("childcare") || lower.includes("daycare")) {
      serviceId = "svc-childcare-subsidy";
      serviceTitle = "Childcare Subsidy Program";
    } else if (lower.includes("liheap") || lower.includes("energy") || lower.includes("utility")) {
      serviceId = "svc-liheap";
      serviceTitle = "LIHEAP (Energy Assistance)";
    } else if (lower.includes("housing") || lower.includes("section 8")) {
      serviceId = "svc-mha-housing";
      serviceTitle = "Section 8 Public Housing";
    } else if (lower.includes("career") || lower.includes("jobs") || lower.includes("workforce")) {
      serviceId = "svc-career-center";
      serviceTitle = "Montgomery Career Center";
    }

    return {
      id: Date.now().toString(),
      role: "assistant",
      content: `I can generate a step-by-step roadmap for ${serviceTitle}. I will pull the official requirements and give you a checklist of what to do.`,
      type: "service-roadmap",
      serviceId,
      serviceTitle,
    };
  }
  // =================================

  return {
    id: Date.now().toString(),
    role: "assistant",
    content: "I hear you. Let me help you figure this out. Could you tell me a bit more about your current situation? For example: Are you working right now? Do you receive any benefits like SNAP or Medicaid? And what's the biggest challenge you're facing today?",
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
