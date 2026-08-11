from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND_APP = ROOT / 'frontend' / 'app'


def test_legacy_route_groups_are_removed_and_direct_routes_exist():
    legacy_groups = ['(auth)', '(admin)', '(customer)', '(setup)', '(tabs)']
    for group in legacy_groups:
        assert not (FRONTEND_APP / group).exists(), f'Legacy route group should be removed: {group}'

    expected_files = [
        'index.tsx',
        'login.tsx',
        'register.tsx',
        'demo.tsx',
        'app/index.tsx',
        'admin/index.tsx',
        'admin/dashboard.tsx',
    ]

    for relative_path in expected_files:
        assert (FRONTEND_APP / relative_path).exists(), f'Missing expected route file: {relative_path}'
