"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { WorkspaceTransitionMode } from "@/lib/workspace";

type WorkspaceLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  transition?: WorkspaceTransitionMode;
  children: ReactNode;
};

export function WorkspaceLink({
  href,
  transition = "default",
  children,
  onClick,
  ...props
}: WorkspaceLinkProps) {
  return (
    <Link
      href={href}
      data-workspace-link
      data-workspace-transition={transition}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
