import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { Hex } from "viem";
import { useSwitchChain } from "wagmi";
import Ionicons from "@expo/vector-icons/Ionicons";
import { IndexerAPICommentSchemaType } from "@ecp.eth/sdk/indexer/schemas";
import { Editor, EditorRef } from "@ecp.eth/react-editor/editor.native";
import {
  useIndexerSuggestions,
  usePinataUploadFiles,
} from "@ecp.eth/react-editor/hooks";
import { css as editorCssText } from "@ecp.eth/react-editor/editor.css.js";
import Button from "../ui/Button";
import { publicEnv } from "../env";
import { usePostComment } from "../hooks/usePostComment";
import { chain } from "../wagmi.config";
import { useOptimisticCommentingManager } from "../hooks/useOptimisticCommentingManager";
import { useShowErrorInToast } from "../hooks/useShowErrorInToast";
import { useAppStateEffect } from "../hooks/useAppStateEffect";
import { useKeyboardRemainingheight } from "../hooks/useKeyboardRemainingHeight";
import theme from "../theme";
import { ApplyFadeToScrollable } from "./ApplyFadeToScrollable";
import useWaitConnected from "../hooks/useWaitConnected";
import { GenerateUploadUrlResponseSchema } from "../lib/generated/schemas";

const chainId = chain.id;
const TOTAL_COMMENT_AREA_PERCENTAGE = 0.5;
const HAS_REPLY_TEXT_TEXTAREA_PERCENTAGE = 0.2;
const HAS_REPLY_TEXT_COMMENT_CONTENT_PERCENTAGE = 0.1;
const lineHeight = 14 * 1.2;

type CommentFormProps = {
  justViewingReplies?: boolean;
  replyingComment?: IndexerAPICommentSchemaType;
  rootComment?: IndexerAPICommentSchemaType;
  onCancelReply: () => void;
};

export function CommentForm({
  justViewingReplies,
  replyingComment,
  rootComment,
  onCancelReply,
}: CommentFormProps) {
  const isReplying = !!replyingComment;

  const waitConnected = useWaitConnected();
  const editorRef = useRef<EditorRef>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [text, setText] = useState("");
  const { switchChainAsync } = useSwitchChain();
  const keyboardRemainingHeight = useKeyboardRemainingheight(
    isReplying
      ? HAS_REPLY_TEXT_TEXTAREA_PERCENTAGE
      : TOTAL_COMMENT_AREA_PERCENTAGE,
  );
  const txHashRef = useRef<Hex | undefined>(undefined);

  const {
    mutateAsync: postComment,
    isPending: isPostingComment,
    error,
    reset,
  } = usePostComment();

  useShowErrorInToast(error);

  useAppStateEffect({
    foregrounded: useCallback(() => {
      if (isPostingComment && !error && !txHashRef.current) {
        // user returned without error and is still posting (could bew still signing) and no tx hash generated
        // probably the wallet hangs we reset state to allow they to try again
        reset();
        setIsProcessing(false);
      }
    }, [error, isPostingComment, reset]),
  });

  useEffect(() => {
    if (justViewingReplies) {
      return;
    }

    if (!replyingComment) {
      return;
    }
    editorRef.current?.focus();
  }, [replyingComment, justViewingReplies]);

  const uploads = usePinataUploadFiles({
    allowedMimeTypes: ["image/jpeg"],
    maxFileSize: 3000,
    pinataGatewayUrl: publicEnv.EXPO_PUBLIC_PINATA_HOST,
    generateUploadUrl: async (filename) => {
      const uploadAPIURL = new URL(
        "/api/generate-upload-url",
        publicEnv.EXPO_PUBLIC_DEMO_API_URL,
      );
      const response = await fetch(uploadAPIURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate upload URL");
      }

      const { url } = GenerateUploadUrlResponseSchema.parse(
        await response.json(),
      );

      return url;
    },
  });

  const suggestions = useIndexerSuggestions({
    indexerApiUrl: publicEnv.EXPO_PUBLIC_INDEXER_URL,
    debounceMs: 700,
  });

  const editable = !isProcessing;
  const editorTheme = useMemo(() => {
    return {
      styleSheetText:
        editorCssText +
        `
      .editor {
        border-width: 1px;
        border-radius: 8px;
        padding: 3px 10px;
        min-height: 80px;
        border-color: ${error ? theme.colors.border.error : theme.colors.border.default};
        color: ${editable ? theme.colors.text.default : theme.colors.text.nonEditable};
        background-color: ${editable ? theme.colors.background.default : theme.colors.background.nonEditable};
        max-height: ${keyboardRemainingHeight}px;
      }
      `,
      editor: {
        classNames:
          "editor placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm",
      },
    };
  }, [editable, error, keyboardRemainingHeight]);

  const insertPendingOperations = useInsertPendingOperations(rootComment);
  const textIsEmpty = !text || text.trim().length === 0;
  const disabledSubmit = textIsEmpty || isPostingComment || isProcessing;

  return (
    <View style={{ gap: 20 }}>
      {replyingComment && (
        <ReplyToComment comment={replyingComment} onClose={onCancelReply} />
      )}

      <Editor
        ref={editorRef}
        disabled={!editable}
        autoFocus={false}
        placeholder={
          replyingComment ? "Write a reply here..." : "Write a comment here..."
        }
        uploads={uploads}
        suggestions={suggestions}
        theme={editorTheme}
        onUpdate={async () => {
          const text = await editorRef.current?.getText();
          setText(text ?? "");
        }}
      />

      <Button
        disabled={disabledSubmit}
        loading={isPostingComment}
        onPress={async () => {
          if (textIsEmpty) {
            return;
          }

          setIsProcessing(true);
          txHashRef.current = undefined;

          try {
            console.log("connecting async...");

            const address = await waitConnected();

            console.log("switching chain...");

            await switchChainAsync({
              chainId,
            });

            console.log("switched, address:", address);

            if (!address) {
              throw new Error("Address not found");
            }

            const commentToPost = replyingComment?.id
              ? {
                  content: text,
                  author: address,
                  parentId: replyingComment.id,
                  metadata: [],
                  chainId: chainId,
                }
              : {
                  content: text,
                  // in react native app we will have to specify a targetUri that is owned by us
                  targetUri: publicEnv.EXPO_PUBLIC_TARGET_URI,
                  author: address,
                  metadata: [],
                  chainId: chainId,
                };

            console.log("posting comment: ", commentToPost);

            const { txHash, commentData, appSignature, commentId } =
              await postComment(commentToPost);
            txHashRef.current = txHash;

            setText("");

            insertPendingOperations({
              chainId,
              txHash: txHash,
              response: {
                data: { ...commentData, id: commentId },
                signature: appSignature,
                hash: commentId,
              },
            });
          } finally {
            setIsProcessing(false);
          }
        }}
      >
        {isReplying ? "Post reply" : "Post comment"}
      </Button>
    </View>
  );
}

const useInsertPendingOperations = (
  rootComment?: IndexerAPICommentSchemaType,
) => {
  const isReplying = !!rootComment;
  const { insertPendingCommentOperation } = useOptimisticCommentingManager([
    "comments",
  ]);
  const { insertPendingCommentOperation: insertPendingReplyOperation } =
    useOptimisticCommentingManager(["replies", rootComment?.id]);
  return useCallback(
    (pendingCommentOperation) => {
      insertPendingCommentOperation(pendingCommentOperation);
      if (isReplying) {
        insertPendingReplyOperation(pendingCommentOperation);
      }
    },
    [insertPendingCommentOperation, insertPendingReplyOperation, isReplying],
  );
};

type ReplyToCommentProps = {
  comment: IndexerAPICommentSchemaType;
  onClose: () => void;
};

function ReplyToComment({ comment, onClose }: ReplyToCommentProps) {
  const replyingCommentContentHeight = useKeyboardRemainingheight(
    HAS_REPLY_TEXT_COMMENT_CONTENT_PERCENTAGE,
  );
  return (
    <View
      style={{
        borderLeftWidth: 2,
        borderColor: theme.colors.reply,
        paddingStart: 10,
        maxHeight:
          Math.ceil(
            Math.min(
              replyingCommentContentHeight,
              Dimensions.get("window").height * 0.3,
            ) / lineHeight,
          ) * lineHeight,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <ApplyFadeToScrollable
        style={{ flex: 1, flexShrink: 1 }}
        fadingPercentage={0.7}
      >
        <ScrollView>
          <Text>{comment.content}</Text>
        </ScrollView>
      </ApplyFadeToScrollable>

      <TouchableOpacity onPress={onClose} style={{ marginStart: 10 }}>
        <Ionicons name="close-circle" size={24} color={theme.colors.reply} />
      </TouchableOpacity>
    </View>
  );
}
