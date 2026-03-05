import {
  Heart,
  Building2,
  Baby,
  GraduationCap,
  ShieldAlert,
  BookOpen,
  Trees,
  Shield,
} from "lucide-react";
import type { ServiceCategory } from "@/lib/types";

export interface CategoryCardConfig {
  id: ServiceCategory;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgLight: string;
}

export const CATEGORY_CARDS: CategoryCardConfig[] = [
  {
    id: "health",
    label: "Healthcare",
    description: "Hospitals, clinics, free screenings, and Medicaid enrollment help",
    icon: Heart,
    color: "text-red-600",
    bgLight: "bg-red-50 border-red-100",
  },
  {
    id: "childcare",
    label: "Childcare",
    description: "Licensed daycare centers, subsidies, and after-school programs",
    icon: Baby,
    color: "text-amber-600",
    bgLight: "bg-amber-50 border-amber-100",
  },
  {
    id: "education",
    label: "Education & Training",
    description: "Schools, GED programs, job training, and workforce certifications",
    icon: GraduationCap,
    color: "text-blue-600",
    bgLight: "bg-blue-50 border-blue-100",
  },
  {
    id: "community",
    label: "Community Centers",
    description: "Workshops, programs, food assistance, and neighborhood resources",
    icon: Building2,
    color: "text-emerald-600",
    bgLight: "bg-emerald-50 border-emerald-100",
  },
  {
    id: "libraries",
    label: "Libraries",
    description: "Free computer access, Wi-Fi, printing, and job search assistance",
    icon: BookOpen,
    color: "text-purple-600",
    bgLight: "bg-purple-50 border-purple-100",
  },
  {
    id: "safety",
    label: "Fire & Safety",
    description: "Fire stations, emergency services, and public safety resources",
    icon: ShieldAlert,
    color: "text-orange-600",
    bgLight: "bg-orange-50 border-orange-100",
  },
  {
    id: "parks",
    label: "Parks & Recreation",
    description: "Parks, playgrounds, sports facilities, and outdoor activities",
    icon: Trees,
    color: "text-green-600",
    bgLight: "bg-green-50 border-green-100",
  },
  {
    id: "police",
    label: "Police & Safety",
    description: "Police stations, precincts, and public safety facilities",
    icon: Shield,
    color: "text-slate-600",
    bgLight: "bg-slate-50 border-slate-100",
  },
];

export interface SituationCard {
  label: string;
  emoji: string;
  category: ServiceCategory;
}

export const SITUATION_CARDS: SituationCard[] = [
  { label: "I need medical help", emoji: "🏥", category: "health" },
  { label: "I need childcare", emoji: "👶", category: "childcare" },
  { label: "I need job training", emoji: "🎓", category: "education" },
];
