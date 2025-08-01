"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditorComposer } from "@/components/editor-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCallback, useMemo } from "react";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { blo } from "blo";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import type { QueryKey } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";

interface ReplyBottomSheetProps {
  channelId: bigint;
  isOpen: boolean;
  onClose: () => void;
  replyingTo: Comment;
  /**
   * The query key to the query where the replying to comment is stored
   */
  replyingToQueryKey: QueryKey;
}

export function ReplyBottomSheet({
  channelId,
  isOpen,
  onClose,
  replyingTo,
  replyingToQueryKey,
}: ReplyBottomSheetProps) {
  const onCloseRef = useFreshRef(onClose);
  const handleSubmitSuccess = useCallback(() => {
    onCloseRef.current?.();
  }, [onCloseRef]);

  const renderResult = useMemo(() => {
    if (!replyingTo) {
      return null;
    }

    return renderToReact({
      content: replyingTo.content,
      references: replyingTo.references,
      maxLength: 100,
      maxLines: 2,
    });
  }, [replyingTo]);

  if (!renderResult) {
    return null;
  }

  const nameOrAddress = getCommentAuthorNameOrAddress(replyingTo.author);
  const avatarUrl =
    replyingTo.author.ens?.avatarUrl || replyingTo.author.farcaster?.pfpUrl;

  return (
    <Sheet open={isOpen} onOpenChange={onCloseRef.current}>
      <SheetContent side="bottom" className="max-w-[400px] mx-auto">
        <SheetHeader>
          <SheetTitle>Reply to message</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Original Comment Preview */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Avatar className="h-6 w-6">
                <AvatarImage
                  src={avatarUrl || blo(replyingTo.author.address)}
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

          <EditorComposer
            autoFocus
            onSubmitSuccess={handleSubmitSuccess}
            placeholder="Write your reply..."
            submitLabel="Reply"
            channelId={channelId}
            queryKey={replyingToQueryKey}
            replyingTo={replyingTo}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
