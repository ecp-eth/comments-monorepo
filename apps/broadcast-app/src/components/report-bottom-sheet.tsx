"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useCallback, useMemo } from "react";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import type { Comment } from "@ecp.eth/shared/schemas";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { blo } from "blo";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { Button } from "./ui/button";
import { useReportComment } from "@/hooks/useReportComment";
import { Loader2Icon, FlagIcon } from "lucide-react";

interface ReportBottomSheetProps {
  comment: Comment;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportBottomSheet({
  comment,
  isOpen,
  onClose,
}: ReportBottomSheetProps) {
  const onCloseRef = useFreshRef(onClose);
  const handleSubmitSuccess = useCallback(() => {
    onCloseRef.current?.();
  }, [onCloseRef]);

  const renderResult = useMemo(() => {
    return renderToReact({
      content: comment.content,
      references: comment.references,
      maxLength: 100,
      maxLines: 2,
    });
  }, [comment]);

  const reportMutation = useReportComment({
    comment,
    onSuccess: handleSubmitSuccess,
  });

  if (!renderResult) {
    return null;
  }

  const nameOrAddress = getCommentAuthorNameOrAddress(comment.author);
  const avatarUrl =
    comment.author.ens?.avatarUrl || comment.author.farcaster?.pfpUrl;

  return (
    <Sheet open={isOpen} onOpenChange={onCloseRef.current}>
      <SheetContent side="bottom" className="max-w-[400px] mx-auto">
        <SheetHeader>
          <SheetTitle>Report comment</SheetTitle>
        </SheetHeader>

        <form
          className="mt-4 space-y-4"
          action={(formData) =>
            reportMutation
              .mutateAsync(formData)
              .then(() => {})
              .catch(() => {})
          }
        >
          {/* Original Comment Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={avatarUrl || blo(comment.author.address)}
                  alt={nameOrAddress}
                />
                <AvatarFallback>
                  {nameOrAddress.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{nameOrAddress}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {renderResult.element}
            </div>
          </div>

          <Textarea
            placeholder="Why are you reporting this comment? (optional)"
            className="resize-none"
            name="reason"
            maxLength={200}
            rows={4}
          />

          <div className="flex items-center">
            <Button
              disabled={reportMutation.isPending}
              className="w-full gap-2"
              size="sm"
              type="submit"
            >
              {reportMutation.isPending ? (
                <Loader2Icon className="h-4 w-4 animate-spin" />
              ) : (
                <FlagIcon className="h-4 w-4" />
              )}
              {reportMutation.isPending ? "Reporting..." : "Report"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
