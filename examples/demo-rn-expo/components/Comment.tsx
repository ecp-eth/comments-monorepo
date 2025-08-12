import React, { useEffect, useState } from "react";
import {
  IndexerAPICommentSchemaType,
  IndexerAPICommentWithRepliesSchemaType,
} from "@ecp.eth/sdk/indexer/schemas";
import { View, Text, TextLayoutLine } from "react-native";
import { useEnrichedAuthor } from "../hooks/useEnrichedAuthor";
import { AuthorBox } from "./AuthorBox";
import { AuthorLinker } from "./AuthorLinker";
import { TimeBox } from "./TimeBox";
import { CommentBottomBar } from "./CommentBottomBar";
import { TRUNCATE_COMMENT_LINES } from "../lib/constants";
import theme from "../theme";
import { mergeLineBreaks } from "../lib/utils";

type CommentProps = {
  comment: IndexerAPICommentSchemaType | IndexerAPICommentWithRepliesSchemaType;
  onReply?: (comment: IndexerAPICommentSchemaType) => void;
  onViewReplies?: (comment: IndexerAPICommentSchemaType) => void;
  onDelete: (comment: IndexerAPICommentSchemaType) => void;
};

export function Comment({
  comment,
  onReply,
  onViewReplies,
  onDelete,
}: CommentProps) {
  const author = useEnrichedAuthor(comment.author);

  return (
    <View
      style={{
        padding: 10,
        borderStartWidth: 1,
        borderStartColor: "#ccc",
        marginVertical: 10,
        gap: 15,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <AuthorLinker author={author}>
          <AuthorBox author={author} />
        </AuthorLinker>

        <TimeBox timestamp={comment.createdAt} />
      </View>
      <CommentContent comment={comment} />
      <CommentBottomBar
        comment={comment}
        onReply={onReply}
        onViewReplies={onViewReplies}
        onDelete={onDelete}
      />
    </View>
  );
}

const READ_MORE_TEXT = "Read more";

/**
 * The component automatically truncates the comment content according to `TRUNCATE_COMMENT_LINES`
 * and also ensure "Read more" is at the end of the last line
 */
function CommentContent({ comment }: { comment: IndexerAPICommentSchemaType }) {
  const [showMore, setShowMore] = useState(false);
  const readMoreText = <> {READ_MORE_TEXT}</>;
  const [isMeasurementCollected, setIsMeasurementCollected] = useState(false);
  const [isTruncated, setIsTruncated] = useState(true);
  const [truncatedContent, setTruncatedContent] = useState<string>();
  const [readMoreWidth, setReadMoreWidth] = useState<number>();
  const [commentContentLines, setCommentContentLines] =
    useState<TextLayoutLine[]>();
  const [boxWidth, setBoxWidth] = useState<number>();

  useEffect(() => {
    if (!readMoreWidth || !commentContentLines || !boxWidth) {
      return;
    }

    setIsMeasurementCollected(true);

    if (commentContentLines.length <= TRUNCATE_COMMENT_LINES) {
      setTruncatedContent(comment.content);
      setIsTruncated(false);
      return;
    }

    setIsTruncated(true);

    let maxNumberOfLines;
    let lastLine: TextLayoutLine;

    do {
      maxNumberOfLines = maxNumberOfLines
        ? maxNumberOfLines - 1
        : TRUNCATE_COMMENT_LINES;
      lastLine = commentContentLines[maxNumberOfLines - 1];
    } while (lastLine.text.trim() === "");

    const truncatedText = commentContentLines
      .slice(0, maxNumberOfLines)
      .map((line) => {
        return line.text;
      })
      .join("")
      // remove the last line break
      .replace(/\n$/, "");

    if (lastLine.width + readMoreWidth < boxWidth) {
      setTruncatedContent(truncatedText + "...");
      return;
    }

    setTruncatedContent(
      truncatedText.slice(
        0,
        // 3 is for "..." and 2 is buffer
        truncatedText.length - READ_MORE_TEXT.length - 3 - 2,
      ) + "...",
    );
  }, [readMoreWidth, commentContentLines, boxWidth, comment.content]);

  return (
    <View
      onLayout={(event) => {
        setBoxWidth(event.nativeEvent.layout.width);
      }}
    >
      {isMeasurementCollected &&
        (!isTruncated || showMore ? (
          <Text>{comment.content}</Text>
        ) : (
          <Text numberOfLines={TRUNCATE_COMMENT_LINES + 1}>
            <Text>
              {truncatedContent ? mergeLineBreaks(truncatedContent) : ""}
            </Text>
            <Text
              style={{
                color: theme.colors.text.link,
              }}
              onPress={() => {
                setShowMore(true);
              }}
            >
              {readMoreText}
            </Text>
          </Text>
        ))}
      {!isMeasurementCollected && (
        <>
          <Text
            numberOfLines={TRUNCATE_COMMENT_LINES + 1}
            onTextLayout={(event) => {
              if (commentContentLines) {
                return;
              }

              setCommentContentLines(event.nativeEvent.lines);
            }}
          >
            {truncatedContent ? truncatedContent : comment.content}
          </Text>
          <Text
            onTextLayout={(event) => {
              if (readMoreWidth) {
                return;
              }

              setReadMoreWidth(event.nativeEvent.lines[0].width);
            }}
          >
            {/* we want it to be measured with the dots */}
            ...{readMoreText}
          </Text>
        </>
      )}
    </View>
  );
}
