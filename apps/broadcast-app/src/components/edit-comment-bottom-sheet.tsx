"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EditorComposer } from "@/components/editor-composer";
import { useCallback } from "react";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import type { QueryKey } from "@tanstack/react-query";
import type { Comment } from "@ecp.eth/shared/schemas";

interface EditCommentBottomSheetProps {
  comment: Comment;
  isOpen: boolean;
  onClose: () => void;
  /**
   * The query key to the query where the comment is stored
   */
  queryKey: QueryKey;
}

export function EditCommentBottomSheet({
  comment,
  isOpen,
  onClose,
  queryKey,
}: EditCommentBottomSheetProps) {
  const onCloseRef = useFreshRef(onClose);
  const handleSubmitSuccess = useCallback(() => {
    onCloseRef.current?.();
  }, [onCloseRef]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onCloseRef.current();
        }
      }}
    >
      <SheetContent side="bottom" className="max-w-[400px] mx-auto">
        <SheetHeader>
          <SheetTitle>Edit comment</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <EditorComposer
            autoFocus
            onSubmitSuccess={handleSubmitSuccess}
            placeholder="Edit your comment..."
            submitLabel="Save"
            submittingLabel="Saving..."
            submitIcon="save"
            channelId={comment.channelId}
            queryKey={queryKey}
            comment={comment}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
