import { env } from "@/lib/env";
import {
  SendEditCommentRequestPayloadRestrictedSchema,
  SignEditCommentRequestPayloadRestrictedSchema,
} from "@/lib/schemas/edit";
import {
  SendPostCommentRequestPayloadRestrictedSchema,
  SignPostCommentRequestPayloadRestrictedSchema,
} from "@/lib/schemas/post";
import { SendDeleteCommentRequestPayloadRestrictedSchema } from "@/lib/schemas/delete";
import { SendApproveSignerRequestPayloadRestrictedSchema } from "@/lib/schemas/approve";
import { ZodSchemaRenderer } from "./components/ZodSchemaRenderer";

const gaslessAvailable =
  env.GASLESS_METHOD === "private-key" || env.GASLESS_METHOD === "privy";
const signerAvailable = !!env.APP_SIGNER_PRIVATE_KEY;

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Ethereum Comments Protocol Signer
        </h1>
        <p className="text-xl text-gray-600">
          API service for signing ECP comments
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Available Endpoints</h2>

        <div className="space-y-6">
          {/* Post Comment - Sign (Non-gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/post-comment/sign
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  signerAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {signerAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Standard comment signing endpoint. Returns signature, hash, and
              comment data.
            </p>
            {signerAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SignPostCommentRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure APP_SIGNER_PRIVATE_KEY environment variable to enable
                standard signing.
              </div>
            )}
          </div>

          {/* Edit Comment - Sign (Non-gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/edit-comment/sign
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  signerAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {signerAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Standard edit comment signing endpoint.
            </p>
            {signerAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SignEditCommentRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure APP_SIGNER_PRIVATE_KEY environment variable to enable
                standard signing.
              </div>
            )}
          </div>

          {/* Post Comment - Send (Gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/post-comment/send
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  gaslessAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gaslessAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Send gasless comment data. Returns either transaction hash and
              typed data for user signature.
            </p>
            {gaslessAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SendPostCommentRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure GASLESS_METHOD and related environment variables to
                enable gasless signing.
              </div>
            )}
          </div>

          {/* Edit Comment - Send (Gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/edit-comment/send
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  gaslessAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gaslessAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Send gasless edit comment data. Returns either transaction hash
              and typed data for user signature.
            </p>
            {gaslessAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SendEditCommentRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure GASLESS_METHOD and related environment variables to
                enable gasless signing.
              </div>
            )}
          </div>

          {/* Delete Comment - Send (Gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/delete-comment/send
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  gaslessAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gaslessAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Send gasless delete comment data.
            </p>
            {gaslessAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SendDeleteCommentRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure GASLESS_METHOD and related environment variables to
                enable gasless signing.
              </div>
            )}
          </div>

          {/* Approve App Signer - Send (Gasless) Endpoint */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">
                POST /api/approve-signer/send
              </h3>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
                  gaslessAvailable
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {gaslessAvailable ? "Available" : "Not Configured"}
              </span>
            </div>
            <p className="text-gray-600 mb-2">
              Send gasless delete comment data.
            </p>
            {gaslessAvailable ? (
              <div className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div>
                  Request:{" "}
                  <ZodSchemaRenderer
                    schema={SendApproveSignerRequestPayloadRestrictedSchema}
                  />
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 p-3 rounded text-sm">
                Configure GASLESS_METHOD and related environment variables to
                enable gasless signing.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold mb-4">Environment Variables</h2>

        <div className="space-y-4">
          <div>
            <h3 className="font-medium text-red-600">Required:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
              <li>
                <code>ENABLED_CHAINS</code> - Comma-separated list of chain IDs
              </li>
              <li>
                <code>DEFAULT_CHAIN_ID</code> - Default chain ID for the service
              </li>
              <li>
                <code>RPC_URL_{"{chainId}"}</code> - RPC URL for each enabled
                chain
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-yellow-600">Optional:</h3>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
              <li>
                <code>APP_SIGNER_PRIVATE_KEY</code> - Private key for app signer
                (enables standard signing)
              </li>
              <li>
                <code>COMMENTS_INDEXER_URL</code> - Comments indexer URL for
                muted account checking
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium text-blue-600">
              Gasless Configuration:
            </h3>
            <ul className="list-disc list-inside text-sm text-gray-600 ml-4">
              <li>
                <code>GASLESS_METHOD</code> - &quot;private-key&quot; or
                &quot;privy&quot;
              </li>
              <li>
                <strong>Private Key Method:</strong>{" "}
                <code>GASLESS_APP_SIGNER_PRIVATE_KEY</code>,{" "}
                <code>GASLESS_SUBMITTER_PRIVATE_KEY</code>
              </li>
              <li>
                <strong>Privy Method:</strong> <code>GASLESS_PRIVY_APP_ID</code>
                , <code>GASLESS_PRIVY_SECRET</code>,{" "}
                <code>GASLESS_PRIVY_AUTHORIZATION_KEY</code>,{" "}
                <code>GASLESS_PRIVY_WALLET_ADDRESS</code>,{" "}
                <code>GASLESS_PRIVY_WALLET_ID</code>,{" "}
                <code>GASLESS_PRIVY_APP_SIGNER_PRIVATE_KEY</code>,{" "}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="text-center">
        <a
          href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fecp-eth%2Fcomments-monorepo%2Ftree%2Ftemplate-signer-api&env=RPC_URL_8453,APP_SIGNER_PRIVATE_KEY,COMMENTS_INDEXER_URL&envDescription=For%20detailed%20Environment%20Variables%20configuration%20please%20see%3A&envLink=https%3A%2F%2Fdocs.ethcomments.xyz%2Fdemos%2Fsigner-api-service%23environment-variables&project-name=signer-api-service&repository-name=signer-api-service"
          className="inline-flex items-center px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path
              fillRule="evenodd"
              d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
              clipRule="evenodd"
            />
          </svg>
          Deploy to Vercel
        </a>
      </div>
    </div>
  );
}
