import clsx from "clsx";
import { NavLink } from "react-router";

type TabsNavigationProps = {
  className?: string;
  links: Array<{ url: string; label: string }>;
};

export default function TabsNavigation({
  className,
  links,
}: TabsNavigationProps) {
  return (
    <nav
      className={clsx(
        "bg-muted text-muted-foreground inline-flex h-9 w-full items-center justify-center rounded-lg p-[3px]",
        className
      )}
    >
      {links.map((link, index) => (
        <NavLink
          key={index}
          to={link.url}
          className={({ isActive }) =>
            clsx(
              "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
              {
                "bg-background dark:bg-input/30 dark:text-foreground dark:border-input shadow-sm":
                  isActive,
                "dark:text-muted-foreground": !isActive,
              }
            )
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  );
}
