"""
Atlas Precision Aerostructures — synthetic event log generator.

Plants a causal DAG with known coefficients so we can measure whether the
discovery + estimation pipeline recovers a truth we already wrote down.
This is a FRESH scenario — new seed, new sample size, new coefficients —
not a relabel of the old "Supplier A" dataset.

DAG (mirrors the reference CausalOCPM pipeline's design: a confounder
driving both treatment and outcome, plus a mediated true causal path):

    spec_complexity (confounder, 1-10)
        |-- sigmoid --> halcyon_forge (treatment, binary)      [NONLINEAR - PC misses this edge]
        |-- linear   --> machine_queue_length (mediator)
        |-- linear   --> delay (small direct effect)

    halcyon_forge --> material_lead_time --> delay             [the mediated TRUE effect]
    machine_queue_length --> approval_duration --> delay
    export_flag (exogenous) --> approval_duration --> delay
    carrier_express (exogenous) --> delay
"""
import numpy as np
import pandas as pd

SEED = 71831
N = 20000
rng = np.random.default_rng(SEED)

# ---- planted structural coefficients (NEW — not the old dataset's values) ----
COEF_TREAT_TO_MLT = 6.8       # halcyon_forge -> material_lead_time
COEF_MLT_TO_DELAY = 0.85      # material_lead_time -> delay
# planted TRUE mediated effect of halcyon_forge on delay:
TRUE_EFFECT = round(COEF_TREAT_TO_MLT * COEF_MLT_TO_DELAY, 4)

COEF_CONF_TO_QUEUE = 0.72     # spec_complexity -> machine_queue_length
COEF_QUEUE_TO_APPR = 1.15     # machine_queue_length -> approval_duration
COEF_EXPORT_TO_APPR = 1.85    # export_flag -> approval_duration
COEF_APPR_TO_DELAY = 0.58     # approval_duration -> delay
COEF_CARRIER_TO_DELAY = -0.58 # carrier_express -> delay
COEF_CONF_TO_DELAY_DIRECT = 0.32  # spec_complexity -> delay (small direct leak)

CONF_SIGMOID_STEEP = 0.32     # curvature of spec_complexity -> P(halcyon) — NON-MONOTONIC
CONF_SIGMOID_MID = 4.2        # complexity level where Halcyon's share peaks (~the distribution's mean)

BL_MLT = 6.4     # baseline material lead time (days)
BL_QUEUE = 2.7   # baseline machine queue length
BL_APPR = 2.1    # baseline approval duration (days)
BL_DELAY = 0.0   # baseline (additive) delay offset


def sigmoid(x):
    return 1 / (1 + np.exp(-x))


def gen():
    idx = np.arange(N)

    # spec_complexity: 1-10, right-skewed (most orders are standard, a tail is
    # tight-tolerance work)
    spec_complexity = np.clip(rng.gamma(shape=2.2, scale=1.9, size=N), 1, 10)

    # order-level attributes
    export_flag = (rng.random(N) < 0.19).astype(int)
    carrier_express = (rng.random(N) < 0.17).astype(int)

    # treatment: halcyon_forge — NON-MONOTONIC (inverted-U) in spec_complexity.
    # Halcyon specializes in mid-tolerance precision work: easy jobs go
    # elsewhere on cost, and the very hardest jobs go to a boutique specialist.
    # This keeps the linear (Pearson) correlation with spec_complexity near
    # zero even though the true dependency is strong — exactly the shape
    # Fisher-Z / linear PC cannot see, unlike a monotonic sigmoid (which a
    # large enough sample can still catch through its linear component).
    # treatment: halcyon_forge — a THRESHOLD effect in spec_complexity, not a
    # smooth trend. Below the tight-tolerance cutoff, routing is roughly
    # evenly split; at or above it, Halcyon is the only qualified forge and
    # takes most of the work. A step function concentrated in the thin tail
    # of a right-skewed distribution barely moves a global linear (Pearson)
    # correlation, even though the dependency is real and strong — exactly
    # the shape Fisher-Z / linear PC is structurally unable to see, while
    # still (unlike an inverted-U) keeping Halcyon's book skewed toward the
    # hardest, slowest-regardless-of-supplier orders.
    TOL_CUTOFF = 7.0
    p_halcyon = np.where(spec_complexity >= TOL_CUTOFF, 0.82, 0.24)
    halcyon_forge = (rng.random(N) < p_halcyon).astype(int)

    # mediators
    material_lead_time = (
        BL_MLT + COEF_TREAT_TO_MLT * halcyon_forge + rng.normal(0, 1.35, N)
    ).clip(min=0.4)
    machine_queue_length = (
        BL_QUEUE + COEF_CONF_TO_QUEUE * (spec_complexity - spec_complexity.mean()) + rng.normal(0, 1.05, N)
    ).clip(min=0)
    approval_duration = (
        BL_APPR
        + COEF_QUEUE_TO_APPR * (machine_queue_length - machine_queue_length.mean())
        + COEF_EXPORT_TO_APPR * export_flag
        + rng.normal(0, 0.85, N)
    ).clip(min=0)

    # outcome
    delay = (
        BL_DELAY
        + COEF_MLT_TO_DELAY * material_lead_time
        + COEF_APPR_TO_DELAY * approval_duration
        + COEF_CARRIER_TO_DELAY * carrier_express
        + COEF_CONF_TO_DELAY_DIRECT * (spec_complexity - spec_complexity.mean())
        + rng.normal(0, 1.3, N)
    ).clip(min=0.3)

    # ---- realistic mess (deliberate, matches the reference pipeline's approach) ----
    # ~2% outliers: a logistics shock adds 8-20 days to a random subset
    outlier_mask = rng.random(N) < 0.02
    delay = np.where(outlier_mask, delay + rng.uniform(8, 20, N), delay)

    # concept drift after row 13,000: a supplier capacity crunch worsens the
    # treatment's penalty slightly for the back third of the log
    drift_mask = idx >= 13000
    delay = np.where(drift_mask & (halcyon_forge == 1), delay + rng.normal(0.9, 0.4, N).clip(min=0), delay)

    # quarterly seasonal pressure (Q4-style aerospace program ramp)
    quarter = (idx % 90) // 23  # coarse 4-bucket cycle
    seasonal = np.where(quarter == 3, rng.normal(0.6, 0.3, N), 0)
    delay = delay + np.clip(seasonal, 0, None)

    # irregular, business-hour-weighted timestamps
    day_offset = np.sort(rng.exponential(scale=1.0, size=N)).cumsum()
    day_offset = day_offset / day_offset.max() * 460  # ~15 months
    start = pd.Timestamp("2024-01-02")
    hours = rng.choice(range(7, 19), size=N, p=_business_hour_weights())
    timestamps = [start + pd.Timedelta(days=float(d)) + pd.Timedelta(hours=int(h)) for d, h in zip(day_offset, hours)]

    category = rng.choice(
        ["Turbine Brackets", "Titanium Forgings", "Composite Panels", "Fastener Sets", "Avionics Housings"],
        size=N,
        p=[0.22, 0.24, 0.18, 0.21, 0.15],
    )
    entity = np.where(
        halcyon_forge == 1,
        "Halcyon Forge",
        rng.choice(["Meridian Tool & Die", "Vantage Alloys", "Solaris Components"], size=N, p=[0.55, 0.2, 0.25]),
    )

    df = pd.DataFrame(
        {
            "order_id": [f"ORD_{i:05d}" for i in range(N)],
            "timestamp": timestamps,
            "category": category,
            "supplier": entity,
            "spec_complexity": np.round(spec_complexity, 2),
            "halcyon_forge": halcyon_forge,
            "export_flag": export_flag,
            "carrier_express": carrier_express,
            "machine_queue_length": np.round(machine_queue_length, 3),
            "material_lead_time": np.round(material_lead_time, 3),
            "approval_duration": np.round(approval_duration, 3),
            "line_side_delivery_delay": np.round(delay, 3),
        }
    )
    return df


def _business_hour_weights():
    hours = list(range(7, 19))
    # weight business hours (9-17) higher than early/late
    w = np.array([1.0, 1.5, 2.2, 2.6, 2.6, 1.4, 1.6, 2.6, 2.6, 2.2, 1.5, 1.0])
    return w / w.sum()


if __name__ == "__main__":
    df = gen()
    out = "atlas_precision_synthetic.csv"
    df.to_csv(out, index=False)
    print(f"wrote {out}  rows={len(df)}")
    print(f"planted TRUE effect (halcyon_forge -> delay, mediated) = {TRUE_EFFECT}")
    print(f"halcyon_forge treated share = {df['halcyon_forge'].mean():.3f}")
    print(df.groupby("halcyon_forge")["line_side_delivery_delay"].agg(["mean", "count"]))
