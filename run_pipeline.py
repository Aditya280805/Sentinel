import subprocess
import sys
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')


print("🚀 Starting Sentinel Data Pipeline Orchestrator...\n")

steps = [
    ("Database Initialization", "init_db.py"),
    ("Data Foundation (Prices)", "data_foundation.py"),
    ("Fundamental Engine", "fundamental_engine.py"),
    ("Macro Technicals", "macro_technical.py"),
    ("Frontend Compiler", "frontend_compiler.py"),
    ("AI Sentiment Engine", "ai_sentiment_engine.py"),
    ("Static JSON Export", "export_static_data.py"),
]

for name, script in steps:
    print(f"{'='*50}")
    print(f"  Step: {name} ({script})")
    print(f"{'='*50}")
    
    # Run the script using the same python executable
    result = subprocess.run([sys.executable, script])
    
    if result.returncode != 0:
        print(f"\n❌ Pipeline failed at step: {name}. Aborting.")
        sys.exit(1)
        
print("\n✅ Entire Sentinel Pipeline completed successfully!")
print("Run 'py app.py' to launch the Flask backend.")
