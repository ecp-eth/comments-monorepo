import { EmbedConfigProvider } from "@/components/EmbedConfigProvider";
import { CommentSection } from "../components/comments/CommentSection";
import { ErrorScreen } from "@/components/ErrorScreen";

type EmbedPageProps = {
  searchParams: Promise<{ targetUri?: string | null }>;
};

export default async function EmbedPage({ searchParams }: EmbedPageProps) {
  const { targetUri } = await searchParams;

  if (typeof targetUri !== "string" || !URL.canParse(targetUri)) {
    return (
      <ErrorScreen description="Target URI is missing or its value isn't a valid URL." />
    );
  }

  return (
    <main className="min-h-screen p-0">
      <div className="max-w-4xl mx-auto bg-white">
        <EmbedConfigProvider value={{ targetUri }}>
          <CommentSection />
        </EmbedConfigProvider>
      </div>
    </main>
  );
}
