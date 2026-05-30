"use client";

/**
 * @fileoverview Reference-navigation chrome (mock SaaS explorer) with Clerk `UserButton` and collapse toggle for workflow editor shells.
 */

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import {
  Search,
  LayoutGrid,
  Boxes,
  BookOpen,
  Gift,
  CircleDollarSign,
  Vote,
  Megaphone,
  GraduationCap,
  Image,
  Video,
  Music,
  BookMarked,
  Settings,
  ChevronDown,
  PanelLeft,
  ShieldCheck,
  AppWindow,
  Languages,
  SquarePen,
} from "lucide-react";

// ─── Nav data ────────────────────────────────────────────────────────────────

const mainNavItems = [
  { icon: <LayoutGrid      className="h-5 w-5 shrink-0" />, label: "All Tools", badge: "5933" },
  { icon: <Boxes           className="h-5 w-5 shrink-0" />, label: "Platform" },
  { icon: <BookOpen        className="h-5 w-5 shrink-0" />, label: "API Docs" },
  { icon: <Gift            className="h-5 w-5 shrink-0" />, label: "Free Credits" },
  { icon: <CircleDollarSign className="h-5 w-5 shrink-0" />, label: "Become an Affiliate" },
  { icon: <Vote            className="h-5 w-5 shrink-0" />, label: "Feature Requests" },
];

const sections = [
  {
    title: "Unfair Advantage",
    items: [
      { icon: <BookOpen       className="h-5 w-5 shrink-0" />, label: "Prompt Library" },
      { icon: <GraduationCap  className="h-5 w-5 shrink-0" />, label: "Tutorials" },
      { icon: <Megaphone      className="h-5 w-5 shrink-0" />, label: "Ad Library" },
    ],
  },
  {
    title: "Generation History",
    items: [
      { icon: <Image  className="h-5 w-5 shrink-0" />, label: "Image Library" },
      { icon: <Video  className="h-5 w-5 shrink-0" />, label: "Video Library" },
      { icon: <Music  className="h-5 w-5 shrink-0" />, label: "Audio Library" },
    ],
  },
  {
    title: "Favorites",
    items: [
      { icon: <BookMarked className="h-5 w-5 shrink-0" />, label: "Saved Prompts" },
    ],
    emptyState: "No favorites yet. Add tools from the tools page.",
  },
  {
    title: "Popular",
    items: [
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Image Generator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Video Generator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Talking Photo" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Lipsync Generator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Image Editor" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "Chat with AI" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "Chat Arena" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI YouTube Summarizer" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Headshot Generator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "Custom GPTs" },
      { icon: <AppWindow      className="h-5 w-5 shrink-0" />, label: "AI App Builder" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Music Generator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Voice Cloner" },
      { icon: <ShieldCheck    className="h-5 w-5 shrink-0" />, label: "AI Content Detector" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Photo Studio" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Logo Generator" },
      { icon: <Languages      className="h-5 w-5 shrink-0" />, label: "AI Translator" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Text To Speech" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Transcription" },
      { icon: <SquarePen      className="h-5 w-5 shrink-0" />, label: "AI Text Humanizer" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Background Remover" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Clothes Changer" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "AI Interior Design" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "Image to Text" },
      { icon: <LayoutGrid     className="h-5 w-5 shrink-0" />, label: "LinkedIn Post Generator" },
    ],
  },
];

// ─── NavItem ─────────────────────────────────────────────────────────────────

/** Single row styled like the reference product explorer (badge optional). */
function NavItem({ icon, label, badge }: { icon: React.ReactNode; label: string; badge?: string }) {
  return (
    <div className="flex w-full items-center gap-3 overflow-hidden rounded-[18px] p-2 text-sm text-gray-700 transition-colors duration-75 hover:bg-neutral-200/60 active:bg-neutral-200/80 cursor-default select-none h-8">
      <span className="text-gray-600 shrink-0">{icon}</span>
      <span className="truncate flex-1">{label}</span>
      {badge && (
        <span className="ml-auto flex items-center justify-center rounded-[18px] bg-indigo-100 px-1.5 py-0.5 text-xs font-semibold text-indigo-600 shrink-0">
          {badge}
        </span>
      )}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

interface LeftSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
}

/** Responsive left navigation rail pairing with dashboard/workflow canvases (`collapsed` width toggles explorer sections). */
export default function LeftSidebar({ collapsed = false, onToggle }: LeftSidebarProps) {
  const { user } = useUser();

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [footerVisible, setFooterVisible] = useState(true);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const displayName =
    user?.fullName ??
    user?.firstName ??
    user?.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "User";

  return (
    <div
      className={`flex-shrink-0 flex flex-col bg-white border-r border-gray-200 transition-all duration-200 overflow-hidden ${
        collapsed ? "w-0" : "w-[240px]"
      }`}
      style={{ minHeight: "100%" }}
    >
      {/* ── Header: logo + PanelLeft toggle ── */}
      <div className="flex h-14 items-center justify-between px-3 pt-3">
        <div className="flex items-center gap-0 pl-0">
          <img
            src="/logo.svg"
            alt="NextFlow logo"
            className="w-10 h-10 flex-shrink-0"
          />
          <span className="text-[20px] font-bold text-gray-900 tracking-tight select-none leading-none">
            NextFlow
          </span>
        </div>
        <button
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-[18px] h-9 w-9 shrink-0 text-gray-500 hover:bg-gray-100 transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeft className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <>
          {/* ── Scrollable content ── */}
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto h-full [scrollbar-width:thin] [scrollbar-color:rgb(209_213_219)_transparent] hover:[scrollbar-color:rgb(156_163_175)_transparent]">

              {/* Search + main nav group */}
              <div className="relative flex w-full min-w-0 flex-col p-2">
                {/* Search */}
                <div className="flex w-full items-center gap-2.5 rounded-[18px] px-3 h-9 text-sm text-gray-500 bg-white border border-gray-200 shadow-sm mb-3 cursor-default select-none">
                  <Search className="w-4 h-4 shrink-0 opacity-60" />
                  <span className="truncate flex-1">Quick search...</span>
                  <kbd className="ml-auto text-xs text-gray-400">⌘K</kbd>
                </div>

                {/* Main nav */}
                <div className="flex w-full min-w-0 flex-col gap-1">
                  {mainNavItems.map((item) => (
                    <NavItem key={item.label} {...item} />
                  ))}
                </div>
              </div>

              {/* Collapsible sections */}
              {sections.map((section) => {
                const isCollapsed = collapsedSections.has(section.title);
                return (
                  <div key={section.title} className="relative flex w-full min-w-0 flex-col p-2">
                    {/* Section label / toggle */}
                    <div className="flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-gray-500">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.title)}
                        className="flex w-full items-center justify-between text-xs font-semibold text-gray-400"
                      >
                        <span>{section.title}</span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-75 ${isCollapsed ? "" : "rotate-180"}`}
                        />
                      </button>
                    </div>

                    {/* Items — grid-rows collapse animation matching reference */}
                    <div
                      className={`w-full text-sm grid transition-[grid-template-rows,opacity] duration-200 ease-in-out ${
                        isCollapsed
                          ? "grid-rows-[0fr] opacity-0 pointer-events-none"
                          : "grid-rows-[1fr] opacity-100"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="flex w-full min-w-0 flex-col gap-1 pt-0.5">
                          {section.items.map((item) => (
                            <NavItem key={item.label} icon={item.icon} label={item.label} />
                          ))}
                          {"emptyState" in section && section.emptyState && (
                            <div className="px-3 py-2 text-xs text-gray-400">
                              {section.emptyState}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom fade overlay */}
            <div className="pointer-events-none absolute bottom-0 left-0 z-10 h-16 w-full bg-gradient-to-t from-white to-transparent" />
          </div>

          {/* ── Footer ── */}
          <div className="flex flex-col gap-2 p-2">

            {/* Settings + Claim Offer — animate in/out */}
            <div
              className={`space-y-2 transition-all duration-300 ease-in-out overflow-hidden ${
                footerVisible ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              {/* Settings */}
              <button className="inline-flex items-center whitespace-nowrap border shadow-sm rounded-[18px] px-3 w-full h-8 text-xs font-medium justify-center gap-1.5 bg-white hover:bg-gray-50 border-gray-200 text-gray-600 hover:text-gray-900 transition-colors">
                <Settings className="w-3.5 h-3.5" />
                Settings
              </button>

              {/* Claim Offer — indigo with shimmer */}
              <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[18px] font-medium h-9 px-4 py-2 w-full text-sm text-white bg-indigo-600/90 hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-1000 before:ease-in-out">
                <Gift className="h-4 w-4" />
                Claim Offer
              </button>
            </div>

            {/* Divider + toggle chevron */}
            <div className="border-t border-gray-200">
              <button
                onClick={() => setFooterVisible((v) => !v)}
                className="w-full py-1 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all"
                aria-label={footerVisible ? "Hide sidebar details" : "Show sidebar details"}
              >
                <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${footerVisible ? "" : "rotate-180"}`} />
              </button>
            </div>

            {/* User row */}
            <div className="flex items-center px-2 py-1 gap-2.5">
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-7 h-7",
                  },
                }}
              />
              <span className="text-sm font-medium text-gray-700 truncate flex-1 select-none">
                {displayName}
              </span>
            </div>

          </div>
        </>
      )}
    </div>
  );
}
