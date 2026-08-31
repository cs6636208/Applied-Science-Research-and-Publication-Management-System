#!/usr/bin/env python3
"""
Reset database script - for development/testing only
This will DELETE ALL data and recreate the schema fresh
"""
import sys
import logging
from database import reset_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

if __name__ == "__main__":
    try:
        # Confirm action
        response = input("⚠️  WARNING: This will DELETE ALL data in the database!\n"
                        "Type 'yes' to confirm: ").strip().lower()
        
        if response != "yes":
            logger.info("Reset cancelled")
            sys.exit(0)
        
        logger.warning("Proceeding with database reset...")
        reset_database()
        logger.info("✅ Database reset completed successfully!")
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"❌ Reset failed: {e}")
        sys.exit(1)
