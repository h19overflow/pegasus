import redis
import logging
import json
from typing import Any, Optional
from scripts.config import require_env

logger = logging.getLogger("redis_cache")

class RedisCache:
    """
    Singleton Redis Client Manager.
    Handles connection, serialization, and error management.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisCache, cls).__new__(cls)
            cls._instance._client = None
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        """Initialize connection from environment variables."""
        try:
            url = require_env("REDIS_URL")
            self._client = redis.from_url(url, decode_responses=False)
            # Test connection
            self._client.ping()
            logger.info("Connected to Redis successfully.")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            self._client = None

    def is_available(self) -> bool:
        """Check if the Redis client is connected and active."""
        if self._client:
            try:
                return self._client.ping()
            except:
                return False
        return False

    def fetch(self, key: str) -> Optional[dict]:
        """Retrieve and deserialize a JSON object from Redis."""
        if not self.is_available():
            return None
        try:
            data = self._client.get(key)
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Redis FETCH error for key {key}: {e}")
        return None

    def store(self, key: str, value: Any, ttl: int = 86400):
        """Serialize and store an object in Redis with an optional TTL."""
        if not self.is_available():
            return
        try:
            # Convert to JSON string if it's a dict or list
            json_data = json.dumps(value) if not isinstance(value, str) else value
            self._client.setex(key, ttl, json_data)
        except Exception as e:
            logger.warning(f"Redis STORE error for key {key}: {e}")

    def delete(self, key: str):
        """Delete a key from Redis."""
        if not self.is_available():
            return
        try:
            self._client.delete(key)
        except Exception as e:
            logger.warning(f"Redis DELETE error for key {key}: {e}")

# Global instance for easy import
cache = RedisCache()
