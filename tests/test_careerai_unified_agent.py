from pathlib import Path


def test_unified_careerai_replaces_vikram():
    state_file = Path(__file__).resolve().parents[1] / 'js' / 'state.js'
    text = state_file.read_text(encoding='utf-8')
    assert 'Vikram Nair' not in text
    assert 'Career Switcher' not in text
    assert 'CareerAI' in text
