from app.core.finance import classify, net_worth, current_liabilities
from tests.conftest import FakeAccount


def test_classify_assets_and_liabilities():
    assert classify("checking")[1] == "asset"
    assert classify("savings")[1] == "asset"
    assert classify("investment")[1] == "asset"
    assert classify("credit card")[1] == "liability"
    assert classify("mortgage")[1] == "liability"
    assert classify("student")[1] == "liability"


def test_classify_unknown_defaults_to_asset():
    label, cls = classify("weird_type")
    assert cls == "asset"
    assert label == "Weird_Type"


def test_net_worth_subtracts_liabilities():
    accounts = [
        FakeAccount("checking", 5000),
        FakeAccount("savings", 10000),
        FakeAccount("credit card", 2000),   # owed → subtract
        FakeAccount("mortgage", 300000),    # owed → subtract
    ]
    nw, assets, liabilities = net_worth(accounts)
    assert assets == 15000
    assert liabilities == 302000
    assert nw == 15000 - 302000


def test_net_worth_does_not_count_debt_as_asset():
    # Regression: the forecast used to sum all balances, counting a credit-card
    # balance as positive net worth.
    accounts = [FakeAccount("checking", 1000), FakeAccount("credit card", 500)]
    nw, _, _ = net_worth(accounts)
    assert nw == 500  # 1000 - 500, not 1500


def test_current_liabilities_only_short_term():
    accounts = [
        FakeAccount("credit card", 1500),
        FakeAccount("line of credit", 500),
        FakeAccount("mortgage", 300000),   # long-term, excluded
        FakeAccount("checking", 9999),     # asset, excluded
    ]
    assert current_liabilities(accounts) == 2000
