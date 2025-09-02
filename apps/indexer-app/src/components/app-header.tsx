import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
} from "./ui/breadcrumb";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  breadcrumbs: {
    label: string;
    href: string;
  }[];
};

export function AppHeader({ breadcrumbs }: AppHeaderProps) {
  const breadcrumbItems = breadcrumbs.flatMap((breadcrumb, index) => {
    const isLast = index === breadcrumbs.length - 1;
    const item = (
      <BreadcrumbItem
        key={breadcrumb.href}
        className={cn(!isLast && "hidden md:block")}
      >
        <BreadcrumbLink asChild>
          <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
        </BreadcrumbLink>
      </BreadcrumbItem>
    );

    if (index === 0) {
      return [item];
    }

    return [
      <BreadcrumbSeparator
        className={cn(!isLast && "hidden md:block")}
        key={"separator-" + breadcrumb.href}
      />,
      item,
    ];
  });

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
      <Breadcrumb>
        <BreadcrumbList>{breadcrumbItems}</BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
