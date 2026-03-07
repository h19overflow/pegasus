"""Full test for context memory - all 5 conversation sequences."""
import asyncio, sys
sys.path.insert(0, ".")
from backend.models import ChatRequest
from backend.chatbot.responder import handle_chat
from backend.chatbot.context_memory import clear_context

results = []
def check(label, cond):
    results.append((label, cond))
    print(f"  {'PASS' if cond else 'FAIL'} {label}")

async def main():
    print("=== TEST 1: Events follow-up ===")
    c = "t1"; clear_context(c)
    r = await handle_chat(ChatRequest(message="What events are happening this weekend?", conversation_id=c))
    check("Q1 city_events", r.intent == "city_events")
    r = await handle_chat(ChatRequest(message="Which of those are free?", conversation_id=c))
    check("Q2 free", "free" in r.answer.lower() or "community" in r.answer.lower() or len(r.source_items) > 0)
    r = await handle_chat(ChatRequest(message="Any family-friendly ones?", conversation_id=c))
    check("Q3 family", "family" in r.answer.lower() or len(r.source_items) > 0)
    r = await handle_chat(ChatRequest(message="Which are closest to downtown?", conversation_id=c))
    check("Q4 downtown", "downtown" in r.answer.lower() or len(r.source_items) > 0)

    print("\n=== TEST 2: Services follow-up ===")
    c = "t2"; clear_context(c)
    r = await handle_chat(ChatRequest(message="What services help someone who lost their job?", conversation_id=c))
    check("Q1 job_loss", r.intent == "job_loss_support")
    r = await handle_chat(ChatRequest(message="Which ones have computer access?", conversation_id=c))
    check("Q2 computer", "computer" in r.answer.lower())
    r = await handle_chat(ChatRequest(message="Any that help with resumes?", conversation_id=c))
    check("Q3 resume", "resume" in r.answer.lower() or "career" in r.answer.lower())

    print("\n=== TEST 3: Trash flow ===")
    c = "t3"; clear_context(c)
    r = await handle_chat(ChatRequest(message="What should I do if my trash wasn't picked up?", conversation_id=c))
    check("Q1 report_issue", r.intent == "report_issue")
    r = await handle_chat(ChatRequest(message="Can you also check the schedule?", conversation_id=c))
    check("Q2 schedule", "schedule" in r.answer.lower() or "monday" in r.answer.lower())
    r = await handle_chat(ChatRequest(message="Help me report it too", conversation_id=c))
    check("Q3 311", "311" in r.answer)

    print("\n=== TEST 4: Traffic follow-up ===")
    c = "t4"; clear_context(c)
    r = await handle_chat(ChatRequest(message="Why is traffic bad downtown today?", conversation_id=c))
    check("Q1 traffic", r.intent == "traffic_or_disruption_reason")
    r = await handle_chat(ChatRequest(message="Is it because of events?", conversation_id=c))
    check("Q2 events", "event" in r.answer.lower())
    check("Q2 stays traffic", r.intent == "traffic_or_disruption_reason")
    r = await handle_chat(ChatRequest(message="Any road closures?", conversation_id=c))
    check("Q3 road/closure", "road" in r.answer.lower() or "closure" in r.answer.lower() or "aldot" in r.answer.lower())
    r = await handle_chat(ChatRequest(message="What about alternative routes?", conversation_id=c))
    check("Q4 routes", "route" in r.answer.lower() or "alternative" in r.answer.lower())

    print("\n=== TEST 5: New resident ===")
    c = "t5"; clear_context(c)
    r = await handle_chat(ChatRequest(message="I just moved to Montgomery. What services should I know about?", conversation_id=c))
    check("Q1 new_resident", r.intent == "new_resident")
    r = await handle_chat(ChatRequest(message="I have two kids, what about schools?", conversation_id=c))
    check("Q2 schools", "school" in r.answer.lower() or "kid" in r.answer.lower() or "child" in r.answer.lower())
    r = await handle_chat(ChatRequest(message="I also need job help", conversation_id=c))
    check("Q3 job", "job" in r.answer.lower() or "career" in r.answer.lower())

    p = sum(1 for _, ok in results if ok)
    print(f"\nResults: {p}/{len(results)} passed")
    for label, ok in results:
        if not ok: print(f"  FAIL: {label}")

asyncio.run(main())
