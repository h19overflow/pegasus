"""Unit tests for chatbot intent classifier and entity extractor."""

import pytest

from backend.chatbot.intents import classify_intent
from backend.chatbot.entities import extract_entities, detect_multi_categories
from backend.models import CivicIntent


# ---------------------------------------------------------------------------
# INTENTS — positive: known phrases map to expected intents
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.parametrize("message,expected_intent", [
    ("There's a pothole on my street", CivicIntent.REPORT_ISSUE),
    ("I want to report graffiti near my house", CivicIntent.REPORT_ISSUE),
    ("Why is there so much traffic on Oak Street?", CivicIntent.TRAFFIC_DISRUPTION),
    ("What events are happening this weekend?", CivicIntent.CITY_EVENTS),
    ("Where is the nearest food bank?", CivicIntent.FIND_SERVICE),
    ("I just moved to Montgomery, what services are available?", CivicIntent.NEW_RESIDENT),
    ("I lost my job last week, what help is there?", CivicIntent.JOB_LOSS_SUPPORT),
    ("What are the trending issues in the city?", CivicIntent.TRENDING_ISSUES),
    ("There's a shooting near downtown", CivicIntent.PUBLIC_SAFETY),
    ("Tell me about the Cloverdale neighborhood", CivicIntent.NEIGHBORHOOD_SUMMARY),
])
def test_classify_intent_maps_phrase_to_correct_intent(message, expected_intent):
    intent, confidence = classify_intent(message)
    assert intent == expected_intent
    assert confidence > 0.0


@pytest.mark.unit
def test_classify_intent_returns_confidence_between_zero_and_one():
    _, confidence = classify_intent("report a broken streetlight")
    assert 0.0 <= confidence <= 1.0


# ---------------------------------------------------------------------------
# INTENTS — negative: unrecognised input falls back to GENERAL
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_classify_intent_returns_general_for_unrecognised_message():
    intent, confidence = classify_intent("xlkjdfasdfkj random gibberish xyz")
    assert intent == CivicIntent.GENERAL


@pytest.mark.unit
def test_classify_intent_returns_general_for_empty_string():
    intent, _ = classify_intent("")
    assert intent == CivicIntent.GENERAL


# ---------------------------------------------------------------------------
# INTENTS — edge cases
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_classify_intent_is_case_insensitive():
    lower_intent, _ = classify_intent("i lost my job")
    upper_intent, _ = classify_intent("I LOST MY JOB")
    assert lower_intent == upper_intent


@pytest.mark.unit
def test_classify_intent_job_loss_wins_over_generic_find_service():
    intent, _ = classify_intent("I got laid off, what services can help me?")
    assert intent == CivicIntent.JOB_LOSS_SUPPORT


# ---------------------------------------------------------------------------
# ENTITIES — address extraction
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_entities_finds_street_address():
    entities = extract_entities("There is a pothole at 456 Oak Street")
    assert entities.address is not None
    assert "456" in entities.address


@pytest.mark.unit
def test_extract_entities_returns_none_address_when_no_address_present():
    entities = extract_entities("What events are happening downtown?")
    assert entities.address is None


# ---------------------------------------------------------------------------
# ENTITIES — neighborhood extraction
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_entities_finds_known_neighborhood():
    entities = extract_entities("Is it safe in Cloverdale?")
    assert entities.neighborhood == "Cloverdale"


@pytest.mark.unit
def test_extract_entities_finds_zip_code_as_neighborhood_fallback():
    entities = extract_entities("What services are near 36109?")
    assert entities.neighborhood == "ZIP 36109"


@pytest.mark.unit
def test_extract_entities_returns_none_neighborhood_for_unknown_area():
    entities = extract_entities("Tell me about Atlantis")
    assert entities.neighborhood is None


# ---------------------------------------------------------------------------
# ENTITIES — issue type extraction
# ---------------------------------------------------------------------------

@pytest.mark.unit
@pytest.mark.parametrize("message,expected_issue", [
    ("There is a pothole on my road", "pothole"),
    ("The street light is out on my block", "streetlight"),
    ("Someone left trash all over the sidewalk", "trash"),
    ("Flooding on the main road after the rain", "flooding"),
])
def test_extract_entities_identifies_issue_type(message, expected_issue):
    entities = extract_entities(message)
    assert entities.issue_type == expected_issue


# ---------------------------------------------------------------------------
# ENTITIES — service category extraction
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_entities_finds_health_service_category():
    entities = extract_entities("Where is the nearest clinic?")
    assert entities.service_category == "health"


@pytest.mark.unit
def test_extract_entities_finds_employment_service_category():
    entities = extract_entities("I am looking for hiring opportunities and career help")
    assert entities.service_category == "employment"


# ---------------------------------------------------------------------------
# ENTITIES — event name extraction
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_entities_finds_quoted_event_name():
    entities = extract_entities('When does "Jazz in the Park" start?')
    assert entities.event_name == "Jazz in the Park"


@pytest.mark.unit
def test_extract_entities_returns_none_event_for_plain_message():
    entities = extract_entities("What time does the library open?")
    assert entities.event_name is None


# ---------------------------------------------------------------------------
# ENTITIES — detect_multi_categories
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_detect_multi_categories_finds_multiple_categories_in_compound_query():
    message = "I lost my job and need food assistance and housing help"
    categories = detect_multi_categories(message)
    assert "employment" in categories
    assert "food" in categories
    assert "housing" in categories


@pytest.mark.unit
def test_detect_multi_categories_returns_empty_list_for_unrelated_message():
    categories = detect_multi_categories("The weather is nice today")
    assert categories == []


# ---------------------------------------------------------------------------
# CONTRACT — ExtractedEntities shape
# ---------------------------------------------------------------------------

@pytest.mark.unit
def test_extract_entities_returns_object_with_all_expected_attributes():
    entities = extract_entities("test message")
    for attr in ("address", "issue_type", "event_name", "neighborhood",
                 "service_category", "date_time"):
        assert hasattr(entities, attr)
