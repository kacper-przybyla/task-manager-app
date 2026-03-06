import os
import yaml
from pathlib import Path
from typing import Dict, Any, List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings loaded from environment and config files"""
    
    # Environment
    environment: str = os.getenv("ENVIRONMENT", "development")
    
    # Database
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/taskdb")
    
    # App settings (loaded from YAML)
    app_name: str = "Task Manager API"
    app_version: str = "1.0.0"
    debug: bool = False
    cors_origins: List[str] = ["*"]
    
    # Database pool settings
    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30
    db_pool_recycle: int = 3600
    
    # Logging
    log_level: str = "INFO"
    log_format: str = "json"
    
    class Config:
        env_file = ".env"
        case_sensitive = False

def load_config() -> Settings:
    """Load configuration from YAML files and environment"""
    settings = Settings()
    
    # Determine config directory
    config_dir = Path(__file__).parent.parent / "config"
    
    # Load base config
    base_config_path = config_dir / "config.yml"
    config_data = {}
    
    if base_config_path.exists():
        with open(base_config_path, 'r') as f:
            config_data = yaml.safe_load(f) or {}
    
    # Load environment-specific config
    env_config_path = config_dir / f"config.{settings.environment}.yml"
    if env_config_path.exists():
        with open(env_config_path, 'r') as f:
            env_config = yaml.safe_load(f) or {}
            # Deep merge
            config_data = deep_merge(config_data, env_config)
    
    # Apply config to settings
    if 'app' in config_data:
        settings.app_name = config_data['app'].get('name', settings.app_name)
        settings.app_version = config_data['app'].get('version', settings.app_version)
        settings.debug = config_data['app'].get('debug', settings.debug)
        settings.cors_origins = config_data['app'].get('cors_origins', settings.cors_origins)
    
    if 'database' in config_data:
        settings.db_pool_size = config_data['database'].get('pool_size', settings.db_pool_size)
        settings.db_max_overflow = config_data['database'].get('max_overflow', settings.db_max_overflow)
        settings.db_pool_timeout = config_data['database'].get('pool_timeout', settings.db_pool_timeout)
        settings.db_pool_recycle = config_data['database'].get('pool_recycle', settings.db_pool_recycle)
    
    if 'logging' in config_data:
        settings.log_level = config_data['logging'].get('level', settings.log_level)
        settings.log_format = config_data['logging'].get('format', settings.log_format)
    
    return settings

def deep_merge(base: Dict[Any, Any], override: Dict[Any, Any]) -> Dict[Any, Any]:
    """Deep merge two dictionaries"""
    result = base.copy()
    for key, value in override.items():
        if key in result and isinstance(result[key], dict) and isinstance(value, dict):
            result[key] = deep_merge(result[key], value)
        else:
            result[key] = value
    return result

# Global settings instance
settings = load_config()
