"""LLM provider abstraction with Mock and Gemini implementations.

Provider selection:
  - GEMINI_API_KEY set → GeminiProvider
  - Otherwise → MockLLMProvider

GeminiProvider falls back to MockLLMProvider logic on any API error.
"""

from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """Abstract base for LLM providers."""

    @abstractmethod
    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        """Generate a text response given a prompt and optional system instruction."""
        ...

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if this provider can make API calls."""
        ...


class MockLLMProvider(LLMProvider):
    """Deterministic template-based provider. Zero API calls."""

    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        # Return a simple template response — the responder builds
        # the real structured answer around this.
        return ""

    def is_available(self) -> bool:
        return True


class GeminiProvider(LLMProvider):
    """Google Gemini provider using google-generativeai SDK."""

    def __init__(self) -> None:
        self._api_key = os.environ.get("GEMINI_API_KEY", "")
        self._model_name = os.environ.get("GEMINI_MODEL", "gemini-2.0-flash")
        self._client = None

        if self._api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self._api_key)
                self._client = genai.GenerativeModel(
                    model_name=self._model_name,
                    generation_config={
                        "temperature": 0.3,
                        "top_p": 0.8,
                        "max_output_tokens": 512,
                    },
                )
                logger.info("GeminiProvider initialized with model=%s", self._model_name)
            except Exception as exc:
                logger.warning("Failed to initialize Gemini SDK: %s", exc)
                self._client = None

    def is_available(self) -> bool:
        return self._client is not None

    async def generate(self, prompt: str, system_instruction: str = "") -> str:
        if not self._client:
            return ""

        try:
            full_prompt = f"{system_instruction}\n\n{prompt}" if system_instruction else prompt
            response = self._client.generate_content(full_prompt)
            return response.text.strip() if response.text else ""
        except Exception as exc:
            logger.warning("Gemini API call failed, falling back: %s", exc)
            return ""


# ── Factory ──────────────────────────────────────────────

_provider_instance: LLMProvider | None = None


def get_llm_provider() -> LLMProvider:
    """Return the singleton LLM provider. Gemini if key is set, else Mock."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    if os.environ.get("GEMINI_API_KEY"):
        provider = GeminiProvider()
        if provider.is_available():
            _provider_instance = provider
            logger.info("Using GeminiProvider")
            return _provider_instance

    _provider_instance = MockLLMProvider()
    logger.info("Using MockLLMProvider (no GEMINI_API_KEY or SDK unavailable)")
    return _provider_instance
