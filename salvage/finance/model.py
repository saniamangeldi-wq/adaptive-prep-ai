"""90-day revenue model for the AdaptivePrep relaunch.
Run: python3 salvage/finance/model.py
Every input is an assumption. Replace with real numbers as they come in (weekly).
"""
KZT_PER_USD = 500  # repo's own pricing implies ~500 (2,500 KZT = $5). Check the live rate.

SCENARIOS = {
    #                 cohort seats (C1, C2), cohort price KZT, centers, center $/mo, center months avg,
    #                 diag sessions, diag $, pro sub-months, sub $
    "floor":    dict(seats=(8, 12),  price_kzt=75_000, centers=1, center_usd=250, center_months=1.5,
                     diag=10, diag_usd=40, sub_months=30,  sub_usd=10),
    "base":     dict(seats=(15, 25), price_kzt=75_000, centers=3, center_usd=250, center_months=2.0,
                     diag=20, diag_usd=40, sub_months=80,  sub_usd=10),
    "stretch":  dict(seats=(20, 35), price_kzt=90_000, centers=5, center_usd=300, center_months=2.0,
                     diag=30, diag_usd=50, sub_months=150, sub_usd=10),
}

# Monthly costs in USD (conservative; check against real invoices)
COSTS = dict(supabase=25, hosting_domain=10, llm_api=60, ads_test=150, payment_fees_pct=0.04)
MONTHS = 3


def run(s):
    cohort = sum(s["seats"]) * s["price_kzt"] / KZT_PER_USD
    b2b = s["centers"] * s["center_usd"] * s["center_months"]
    diag = s["diag"] * s["diag_usd"]
    subs = s["sub_months"] * s["sub_usd"]
    gross = cohort + b2b + diag + subs
    fixed = (COSTS["supabase"] + COSTS["hosting_domain"] + COSTS["llm_api"] + COSTS["ads_test"]) * MONTHS
    fees = gross * COSTS["payment_fees_pct"]
    return dict(cohort=cohort, b2b=b2b, diagnostics=diag, subscriptions=subs,
                gross=gross, costs=fixed + fees, net=gross - fixed - fees)


if __name__ == "__main__":
    cols = ["cohort", "b2b", "diagnostics", "subscriptions", "gross", "costs", "net"]
    print(f"{'scenario':<9}" + "".join(f"{c:>14}" for c in cols))
    for name, s in SCENARIOS.items():
        r = run(s)
        print(f"{name:<9}" + "".join(f"{r[c]:>14,.0f}" for c in cols))
