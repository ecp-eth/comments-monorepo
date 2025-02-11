"use client";

import { CommentSectionGasless } from "../components/comments/CommentSectionGasless";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Comments</h1>
        </div>
        <CommentSectionGasless />
      </div>
    </main>
  );
}
