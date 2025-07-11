import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { publicEnv } from "@/publicEnv";
import { createReportCommentTypedData } from "@ecp.eth/sdk/comments";
import { reportComment } from "@ecp.eth/sdk/indexer";
import { useFreshRef } from "@ecp.eth/shared/hooks";
import { Comment } from "@ecp.eth/shared/schemas";
import { createContext, useContext, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAccount, useSignTypedData } from "wagmi";

type ReportCommentDialogContextType = {
  isOpen: boolean;
  selectedComment: Comment | null;
  open: (comment: Comment) => void;
  close: () => void;
};

const ReportCommentDialogContext =
  createContext<ReportCommentDialogContextType>({
    open: () => {},
    close: () => {},
    selectedComment: null,
    isOpen: false,
  });

export function ReportCommentDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedComment, setSelectedComment] = useState<Comment | null>(null);

  const openRef = useFreshRef((comment: Comment) => {
    setSelectedComment(comment);
  });

  const closeRef = useFreshRef(() => {
    setSelectedComment(null);
  });

  const contextValue = useMemo(() => {
    return {
      isOpen: !!selectedComment,
      open: openRef.current,
      close: closeRef.current,
      selectedComment,
    };
  }, [selectedComment, openRef, closeRef]);

  return (
    <ReportCommentDialogContext.Provider value={contextValue}>
      {children}
    </ReportCommentDialogContext.Provider>
  );
}

export function ReportCommentDialogRenderer() {
  const { address, chainId } = useAccount();
  const { isOpen, close, selectedComment } = useReportCommentDialog();
  const { signTypedDataAsync } = useSignTypedData();

  if (!address || !chainId || !selectedComment) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          close();
        }
      }}
    >
      <DialogContent className="apply-theme">
        <DialogHeader>
          <DialogTitle>Report Comment</DialogTitle>
          <DialogDescription>
            You can optionally provide a reason for reporting this comment.
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-2"
          id="report-comment-form"
          action={async (formData) => {
            try {
              const reason = formData.get("reason");
              const typedData = createReportCommentTypedData({
                chainId,
                commentId: selectedComment.id,
                reportee: selectedComment.author.address,
                message: reason?.toString().trim(),
              });
              const signature = await signTypedDataAsync(typedData);

              await reportComment({
                chainId,
                commentId: typedData.message.commentId,
                reportee: typedData.message.reportee,
                message: typedData.message.message,
                signature,
                apiUrl: publicEnv.NEXT_PUBLIC_COMMENTS_INDEXER_URL,
              });

              toast.success("Comment reported successfully");

              close();
            } catch (error) {
              console.error(error);

              toast.error("Failed to report comment");
            }
          }}
        >
          <Label htmlFor="report-comment-reason">Reason</Label>
          <Textarea
            maxLength={200}
            rows={4}
            placeholder="Optional: Describe why you're reporting this comment"
            name="reason"
            id="report-comment-reason"
          />
        </form>
        <DialogFooter>
          <Button type="submit" form="report-comment-form">
            Report
          </Button>
          <Button type="button" variant="outline" onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function useReportCommentDialog() {
  return useContext(ReportCommentDialogContext);
}
