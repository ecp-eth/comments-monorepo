import { type ComponentType, useState } from "react";
import {
  ArrowBigDown,
  ArrowBigUp,
  ChevronDown,
  ChevronUp,
  Heart,
  Repeat2,
} from "lucide-react";
import {
  createPhosphorIconUrl,
  isLikelyEmojiIcon,
  normalizeReactionIcon,
} from "@/lib/reactions";
import { cn } from "@/lib/utils";

const iconComponentByName: Record<
  string,
  ComponentType<{ className?: string }>
> = {
  heart: Heart,
  repost: Repeat2,
  repeat: Repeat2,
  upvote: ChevronUp,
  "arrow-fat-up": ArrowBigUp,
  "caret-up": ChevronUp,
  downvote: ChevronDown,
  "arrow-fat-down": ArrowBigDown,
  "caret-down": ChevronDown,
};

type ReactionIconProps = {
  icon: string;
  className?: string;
};

export function ReactionIcon({ icon, className }: ReactionIconProps) {
  const [didImageLoadFail, setDidImageLoadFail] = useState(false);
  const normalizedIcon = normalizeReactionIcon(icon);
  const IconComponent = iconComponentByName[normalizedIcon];

  if (isLikelyEmojiIcon(icon)) {
    return (
      <span className={cn("text-[14px] leading-none", className)}>{icon}</span>
    );
  }

  if (IconComponent) {
    return <IconComponent className={cn("h-3.5 w-3.5", className)} />;
  }

  if (didImageLoadFail || !normalizedIcon) {
    return <span className={cn("text-[11px] leading-none", className)}>?</span>;
  }

  const iconUrl = createPhosphorIconUrl(normalizedIcon);

  return (
    // eslint-disable-next-line @next/next/no-img-element -- custom icon slugs can map to any phosphor icon asset
    <img
      alt=""
      aria-hidden="true"
      className={cn("h-3.5 w-3.5 dark:invert dark:brightness-200", className)}
      onError={() => {
        setDidImageLoadFail(true);
      }}
      src={iconUrl}
    />
  );
}
