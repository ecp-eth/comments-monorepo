export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
        <h1 className="text-3xl font-bold mb-8">Terms and Conditions</h1>

        <div className="prose prose-gray max-w-none">
          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">1. Eligibility</h2>
            <p className="mb-2">
              You must be at least 18 years old to use the App.
            </p>
            <p>
              By using the App, you represent and warrant that you meet this
              requirement.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">2. Service Overview</h2>
            <p className="mb-2">
              The ECP Dashboard App is a web application that allows you to
              manage your applications and configure outbound webhooks for
              events. The App does not create or host user content; it provides
              tooling for receiving event notifications at your specified
              endpoints.
            </p>
            <p>
              You are responsible for your endpoint availability, correctness,
              and security, including any code or infrastructure that processes
              webhook deliveries.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              3. Account & Authentication
            </h2>
            <p className="mb-2">
              You sign in using Sign-In with Ethereum (SIWE). We do not store
              any personal details other than your Ethereum address, which is
              required for SIWE.
            </p>
            <p>
              For each application, we store its name and a generated secret
              key. For each webhook, we store its name, the endpoint url, the
              event types it is subscribed to, the authentication configuration
              used to call your endpoint (no auth, HTTP Basic, or custom
              header), and delivery attempt logs.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              4. Webhook Delivery & Ordering
            </h2>
            <p className="mb-2">
              We guarantee in-order delivery per webhook subscription (FIFO per
              subscription identifier). When a delivery fails, it does not block
              the queue for subsequent events for that subscription.
            </p>
            <ul className="list-disc pl-6 mb-2">
              <li>
                Each event is signed using HMAC with the application secret key.
              </li>
              <li>
                Each event includes a <code>uid</code> field that can be used
                for idempotency/deduplication.
              </li>
              <li>
                A delivery is considered successful if your endpoint returns a
                status code between 200 and 399 inclusive. Redirects are not
                followed.
              </li>
              <li>Request timeout is 5 seconds per attempt.</li>
              <li>
                Failed deliveries are retried with exponential backoff up to 20
                total attempts.
              </li>
              <li>
                After the final attempt, the delivery is marked as failed and
                visible in your dashboard. Deliveries are retained; future
                manual retry functionality may be provided.
              </li>
            </ul>
            <p>
              We recommend validating the signature, handling idempotency using{" "}
              <code>uid</code>, and responding quickly to avoid timeouts. You
              are responsible for ensuring your endpoint can accept and process
              deliveries.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              5. Fees, Availability & SLA
            </h2>
            <p className="mb-2">
              The service is currently provided free of charge and without any
              service-level agreement (SLA).
            </p>
            <p>
              The App may be modified, suspended, or discontinued at any time
              without notice.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              6. Data Retention & Deletion
            </h2>
            <p className="mb-2">
              When you remove a webhook, its delivery logs are deleted. When you
              remove an application, its webhooks and associated logs are
              deleted.
            </p>
            <p>
              We retain the above data only to operate the App and provide
              delivery logs.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">7. Security</h2>
            <p className="mb-2">
              Keep your application secret key and endpoint credentials secure.
              You are responsible for any activity that occurs using your
              secrets or credentials.
            </p>
            <p>
              We are not responsible for losses arising from compromised
              endpoints, credentials, or secrets under your control.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">8. Acceptable Use</h2>
            <p className="mb-2">
              You may not misuse the App, interfere with its operation, attempt
              to gain unauthorized access, or use it for unlawful purposes. You
              must comply with applicable laws and regulations when using the
              App.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">9. Disclaimers</h2>
            <p className="mb-2">
              The App is provided on an “as is” and “as available” basis without
              warranties of any kind, whether express, implied, or statutory,
              including but not limited to warranties of merchantability,
              fitness for a particular purpose, and non-infringement.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              10. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Discove Inc. and its
              affiliates, officers, employees, and agents shall not be liable
              for any indirect, incidental, consequential, special, exemplary,
              or punitive damages, or any loss of data, business, or profits,
              arising from or related to your use of the App.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of Delaware,
              United States, without regard to conflict of law principles.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">12. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              App after changes are posted constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">13. Contact</h2>
            <p className="mb-2">If you have questions, please contact us at:</p>
            <p className="mb-1">
              <strong>Discove Inc.</strong>
            </p>
            <p>
              Email:{" "}
              <a
                href="mailto:david@ethcomments.xyz"
                className="text-blue-600 hover:underline"
              >
                david@ethcomments.xyz
              </a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
