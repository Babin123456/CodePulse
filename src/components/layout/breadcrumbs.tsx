"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

function decodeLabel(segment: string) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  if (!segments.length || segments[0] === "dashboard") return null;

  const crumbs = [
    { href: "/dashboard", label: "Dashboard" },
    ...segments.map((segment, index) => ({
      href: `/${segments.slice(0, index + 1).join("/")}`,
      label: index === 0 ? segment.charAt(0).toUpperCase() + segment.slice(1) : decodeLabel(segment),
    })),
  ];

  return (
    <Breadcrumb aria-label="Breadcrumb" className="mb-4">
      <BreadcrumbList className="flex-nowrap gap-1 sm:gap-1.5">
        {crumbs.map(({ href, label }, index) => {
          const isCurrent = index === crumbs.length - 1;
          return (
            <Fragment key={href}>
              {index > 0 && <BreadcrumbSeparator className="shrink-0" />}
              <BreadcrumbItem className={isCurrent ? "min-w-0" : "shrink-0"}>
                {isCurrent ? (
                  <BreadcrumbPage className="truncate" title={label}>{label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink render={<Link href={href} />}>{label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
