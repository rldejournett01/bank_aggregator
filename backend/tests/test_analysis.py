from datetime import date

from app.routes.analysis import (
    _normalize_merchant,
    _cadence_from_gap,
    _amounts_consistent,
    _detect_recurring,
    _compute_bills_and_income,
    _is_bill,
    _is_income,
)
from tests.conftest import FakeTx


# ---- normalization --------------------------------------------------------

def test_normalize_strips_numbers_and_punctuation():
    assert _normalize_merchant("NETFLIX *1234", None) == "netflix"
    assert _normalize_merchant(None, "SQ *Joe's Coffee #42") == "sq joe s coffee"


# ---- cadence --------------------------------------------------------------

def test_cadence_buckets():
    assert _cadence_from_gap(7)[0] == "weekly"
    assert _cadence_from_gap(14)[0] == "biweekly"
    assert _cadence_from_gap(30)[0] == "monthly"
    assert _cadence_from_gap(90)[0] == "quarterly"
    assert _cadence_from_gap(365)[0] == "yearly"
    assert _cadence_from_gap(None) == ("monthly", 1.0)


def test_amounts_consistent():
    assert _amounts_consistent([100.0, 101.0, 99.0]) is True
    assert _amounts_consistent([10.0, 500.0]) is False
    assert _amounts_consistent([100.0]) is False


# ---- recurrence detection -------------------------------------------------

def _monthly(merchant, amount, months, day=1, category=None):
    """Build one tx per month for the given month numbers in 2026."""
    return [
        FakeTx(amount=amount, date=date(2026, m, day),
               description=merchant, merchant_name=merchant, category=category)
        for m in months
    ]


def test_detects_rent_without_keyword():
    # "Oak Street Apartments" matches no keyword but recurs monthly → a bill.
    txs = _monthly("Oak Street Apartments", -1800.0, [1, 2, 3])
    bills = _detect_recurring(txs, inflow=False, keyword_fn=_is_bill)
    assert len(bills) == 1
    assert bills[0]["name"] == "Oak Street Apartments"
    assert bills[0]["amount"] == 1800.0
    assert bills[0]["frequency"] == "monthly"
    assert bills[0]["occurrences"] == 3


def test_single_nonkeyword_purchase_is_not_a_bill():
    txs = [FakeTx(-42.0, date(2026, 1, 5), "Random Store", "Random Store")]
    bills = _detect_recurring(txs, inflow=False, keyword_fn=_is_bill)
    assert bills == []


def test_keyword_match_counts_even_if_single():
    txs = [FakeTx(-15.99, date(2026, 1, 5), "Netflix", "Netflix")]
    bills = _detect_recurring(txs, inflow=False, keyword_fn=_is_bill)
    assert len(bills) == 1
    assert bills[0]["amount"] == 15.99


def test_income_detection_recurring_payroll():
    txs = _monthly("Acme Payroll", 3000.0, [1, 2, 3])
    income = _detect_recurring(txs, inflow=True, keyword_fn=_is_income)
    assert len(income) == 1
    assert income[0]["amount"] == 3000.0


def test_inflow_excluded_from_bills_and_vice_versa():
    income_tx = _monthly("Acme Payroll", 3000.0, [1, 2, 3])
    bills = _detect_recurring(income_tx, inflow=False, keyword_fn=_is_bill)
    assert bills == []


def test_weekly_cadence_normalised_to_monthly_amount():
    # $50 every ~7 days should normalise to ~ $217/mo (50 * 52/12).
    txs = [
        FakeTx(-50.0, date(2026, 1, d), "Gym Weekly", "Gym Weekly")
        for d in (1, 8, 15, 22, 29)
    ]
    bills = _detect_recurring(txs, inflow=False, keyword_fn=_is_bill)
    assert len(bills) == 1
    assert bills[0]["frequency"] == "weekly"
    assert 210 < bills[0]["amount"] < 220


def test_compute_bills_and_income_totals():
    txs = (
        _monthly("Oak Street Apartments", -1800.0, [1, 2, 3])
        + _monthly("City Power & Light", -120.0, [1, 2, 3])
        + _monthly("Acme Payroll", 4000.0, [1, 2, 3])
    )
    bills, income, monthly_bills, stable_income = _compute_bills_and_income(txs)
    assert monthly_bills == 1920.0
    assert stable_income == 4000.0
    assert {b["name"] for b in bills} == {"Oak Street Apartments", "City Power & Light"}
    assert stable_income - monthly_bills == 2080.0  # surplus
