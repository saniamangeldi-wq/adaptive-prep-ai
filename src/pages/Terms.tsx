import { Link } from "react-router-dom";
import { GraduationCap, ArrowLeft } from "lucide-react";

const LAST_UPDATED = "14 August 2026";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="font-semibold text-foreground">AdaptivePrep</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-foreground">Terms of Service</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-10 space-y-10">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Subscriptions and billing</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Paid plans are sold as recurring subscriptions billed in advance for each billing period
              (monthly or annual, as selected at checkout). By subscribing, you authorise us and our
              payment processor to charge your payment method automatically at the start of each billing
              period until you cancel.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Prices are shown at checkout and include any applicable taxes where required. We may change
              plan pricing for future billing periods, and we will notify you before a price change takes
              effect. Your existing period is never re-priced after payment.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Free trials</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Where a free trial is offered, you may use the trial features for the stated trial length at
              no cost. If you cancel before the trial ends, you will not be charged and your account
              returns to the free plan when the trial expires.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If you do not cancel before the trial ends, the trial converts automatically into a paid
              subscription and your payment method is charged for the first billing period. Once that
              charge is made, it is subject to the no-refund policy in section 4. Trials are limited to one
              per user and may not be repeated by creating additional accounts.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Cancellation and access until period end</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may cancel your subscription at any time, for any reason, from the Billing page in your
              account. Cancellation takes effect immediately in the sense that no further charges will be
              made to your payment method. You do not need to contact support, and we will never require
              you to call, email, or complete additional steps in order to cancel.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              After cancelling, you keep full access to all features of your plan until the end of the
              billing period you have already paid for. When that period ends, your account moves to the
              free plan. Your account, progress, test history, and saved study material remain available on
              the free plan, subject to free-plan limits.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You may resubscribe at any time. Resubscribing starts a new billing period at the price then
              in effect.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. No refunds</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">
                All payments are final and non-refundable.
              </span>{" "}
              This includes payments for partial billing periods and for periods during which you did not
              use the service.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
              <li>
                Cancelling does not trigger a refund, a partial refund, proration, or account credit for
                unused time. Instead, you retain access for the remainder of the period you paid for, as
                described in section 3.
              </li>
              <li>
                Charges made after a free trial converts are non-refundable. You are responsible for
                cancelling before the trial ends if you do not wish to be billed.
              </li>
              <li>
                One-time purchases, including question top-ups and other credit packs, are non-refundable
                once the credits or questions have been added to your account.
              </li>
              <li>
                Annual plans are non-refundable in whole or in part after the payment has been taken.
              </li>
            </ul>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Exceptions.</span> We will refund a payment
              where we are required to do so by the mandatory consumer-protection law that applies to you,
              where you were charged in error or charged more than once for the same billing period, or
              where a charge was made after a valid cancellation was completed. If you believe one of these
              applies, email{" "}
              <a href="mailto:hello@adaptiveprep.org" className="text-primary hover:underline">
                hello@adaptiveprep.org
              </a>{" "}
              within 30 days of the charge with your account email and the date of the payment, and we will
              investigate and respond.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Nothing in this section limits any statutory cancellation or withdrawal right you may have as
              a consumer in your country of residence.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Failed payments and suspension</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              If a renewal payment fails, we may retry the charge and will notify you by email. If payment
              is not completed, your subscription may be downgraded to the free plan. Amounts already paid
              for previous periods remain non-refundable.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Chargebacks</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Please contact us before disputing a charge with your bank so we can resolve the issue
              directly. We may suspend accounts with open or repeated payment disputes until the dispute is
              resolved.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Contact</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Questions about these terms or about a charge on your account? Email{" "}
              <a href="mailto:hello@adaptiveprep.org" className="text-primary hover:underline">
                hello@adaptiveprep.org
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
