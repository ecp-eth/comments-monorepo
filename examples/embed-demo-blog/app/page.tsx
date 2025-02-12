import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">
        Demo Blog using Ecp.eth comments.
      </h1>
      <p className="mb-4">
        This demo blog showcases the integration of ecp.eth comments embed,
        allowing users to view and interact with comments on each blog article
        page seamlessly. The ecp.eth comments system provides a decentralized
        and secure way to manage user feedback, enhancing the overall engagement
        and interactivity of the blog.
      </p>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  );
}
