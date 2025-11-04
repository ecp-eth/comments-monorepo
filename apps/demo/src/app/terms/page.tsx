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
            <h2 className="text-xl font-semibold mb-3">2. Use of the App</h2>
            <p className="mb-2">
              The App provides a user interface to decentralized protocols - we
              do not control the content posted on these protocols.
            </p>
            <p>
              You are solely responsible for your interactions with the
              blockchain, including signing messages, submitting transactions,
              and managing your wallet.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">3. Fees & Payments</h2>
            <p className="mb-2">
              Use of the App may require you to pay blockchain transaction fees
              (&quot;gas&quot;) or protocol-related fees. These fees are
              determined by the network and are not controlled by us.
            </p>
            <p>All fees are final and non-refundable.</p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">4. Content</h2>
            <p className="mb-2">
              Users may submit text, images, or other media through the App,
              which may be stored publicly and permanently on decentralized
              networks.
            </p>
            <p className="mb-2">
              You are solely responsible for the content you create, upload, or
              share.
            </p>
            <p className="mb-2">
              You must not upload or share content that is:
            </p>
            <ul className="list-disc pl-6 mb-2">
              <li>illegal, infringing, abusive, or harmful;</li>
              <li>
                sexually explicit, pornographic, or obscene (&quot;NSFW&quot;);
              </li>
              <li>
                exploitative of minors or otherwise violates child protection
                laws;
              </li>
              <li>incites violence, terrorism, or criminal activity.</li>
            </ul>
            <p>
              We disclaim all responsibility and liability for any content
              stored on decentralized protocols.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              5. No Custody & No Guarantees
            </h2>
            <p className="mb-2">
              We do not custody your private keys, funds, or assets. You are
              responsible for securing your wallet and private keys.
            </p>
            <p>
              The App is provided &quot;as is&quot; without warranties of any
              kind. We do not guarantee availability, accuracy, or reliability
              of the App or underlying protocols.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              6. Assumption of Risk
            </h2>
            <p className="mb-2">
              Blockchain technology is experimental and may involve risks,
              including but not limited to: loss of funds, irreversible
              transactions, bugs, and protocol failures.
            </p>
            <p>
              By using the App, you acknowledge these risks and agree that we
              are not liable for any damages, losses, or claims arising from
              your use of the App or decentralized protocols.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">
              7. Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Discove Inc. and its
              affiliates, officers, employees, or agents shall not be liable for
              any indirect, incidental, consequential, or punitive damages, or
              any loss of data, assets, or profits, arising from or related to
              your use of the App.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">8. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed under the laws of
              the State of Delaware, United States, without regard to conflict
              of law principles.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Continued use of the
              App after changes are posted constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
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
