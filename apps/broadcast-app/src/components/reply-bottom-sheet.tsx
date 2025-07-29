"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditorComposer } from "@/components/editor-composer";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer";
import { useCallback, useMemo } from "react";
import { renderToReact } from "@ecp.eth/shared/renderer";
import { getCommentAuthorNameOrAddress } from "@ecp.eth/shared/helpers";
import { blo } from "blo";
import type { QueryKey } from "@tanstack/react-query";
import { useFreshRef } from "@ecp.eth/shared/hooks";

interface ReplyBottomSheetProps {
  channelId: bigint;
  isOpen: boolean;
  onClose: () => void;
  originalComment: IndexerAPICommentSchemaType | null;
  queryKey: QueryKey;
}

export function ReplyBottomSheet({
  channelId,
  isOpen,
  onClose,
  originalComment,
  queryKey,
}: ReplyBottomSheetProps) {
  const onCloseRef = useFreshRef(onClose);
  const handleSubmitSuccess = useCallback(() => {
    onCloseRef.current?.();
  }, [onCloseRef]);

  const renderResult = useMemo(() => {
    if (!originalComment) {
      return null;
    }

    return renderToReact({
      content: originalComment.content,
      references: originalComment.references,
      maxLength: 100,
      maxLines: 2,
    });
  }, [originalComment]);

  if (!renderResult || !originalComment) {
    return null;
  }

  const nameOrAddress = getCommentAuthorNameOrAddress(originalComment.author);
  const avatarUrl =
    originalComment.author.ens?.avatarUrl ||
    originalComment.author.farcaster?.pfpUrl;

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
                  src={avatarUrl || blo(originalComment.author.address)}
                  alt={nameOrAddress}
                />
                <AvatarFallback>
                  {nameOrAddress.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{nameOrAddress}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {renderResult.element}
            </p>
          </div>

          <EditorComposer
            autoFocus
            onSubmitSuccess={handleSubmitSuccess}
            placeholder="Write your reply..."
            submitLabel="Reply"
            channelId={channelId}
            queryKey={queryKey}
            replyingTo={originalComment}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
