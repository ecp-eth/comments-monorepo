import { EmbedConfigProvider } from "@/components/EmbedConfigProvider";
import { CommentSection } from "../components/comments/CommentSection";

type EmbedPageProps = {
  params: Promise<{ targetUri: string }>;
};

export default async function EmbedPage({ params }: EmbedPageProps) {
  const { targetUri } = await params;

  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Comments</h1>
        </div>
        <EmbedConfigProvider value={{ targetUri }}>
          <CommentSection />
        </EmbedConfigProvider>
      </div>
    </main>
  );
}
