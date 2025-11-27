import os
import psutil
import uvicorn
import winreg 
# Constraint check: "Library Constraints: Use 'psutil' for system stats, 'winreg' for game detection."
# It doesn't explicitly forbid other libs, but "compiled to executable" suggests keeping it simple.
# I'll write a simple ACF parser to avoid extra dependencies if possible, or just use simple text processing.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Optional

app = FastAPI()

# Allow CORS for Electron frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_steam_path():
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, r"Software\Valve\Steam")
        path, _ = winreg.QueryValueEx(key, "SteamPath")
        return path
    except Exception as e:
        print(f"Could not find Steam path via winreg: {e}")
        # Fallback to standard location
        return r"C:\Program Files (x86)\Steam"

def parse_acf(file_path):
    """
    Simple parser for Steam appmanifest files to extract Name and AppID.
    """
    info = {}
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if '"appid"' in line:
                    info['id'] = line.split('"')[3]
                elif '"name"' in line:
                    info['name'] = line.split('"')[3]
                elif '"installDir"' in line:
                    info['installDir'] = line.split('"')[3]
    except Exception:
        pass
    return info

@app.get("/health")
def get_system_health():
    cpu_percent = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    gpu_percent = 0 
    return {
        "cpu": cpu_percent,
        "ram": memory.percent,
        "gpu": gpu_percent,
        "ram_used_gb": round(memory.used / (1024**3), 2),
        "ram_total_gb": round(memory.total / (1024**3), 2)
    }

@app.post("/play/{game_id}")
def play_game(game_id: str):
    """
    Launches a Steam game using the steam:// protocol.
    """
    try:
        # This is the standard way to launch Steam games on Windows
        os.startfile(f"steam://run/{game_id}")
        return {"status": "launching", "game_id": game_id}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/games")
def get_games():
    steam_path = get_steam_path()
    games = []
    
    # Check default steamapps folder
    steamapps_path = os.path.join(steam_path, "steamapps")
    if os.path.exists(steamapps_path):
        # Scan for appmanifest files
        for file in os.listdir(steamapps_path):
            if file.startswith("appmanifest_") and file.endswith(".acf"):
                full_path = os.path.join(steamapps_path, file)
                data = parse_acf(full_path)
                if 'name' in data and 'id' in data:
                    # Verify install directory exists
                    install_dir = os.path.join(steamapps_path, "common", data.get('installDir', ''))
                    if os.path.exists(install_dir):
                        games.append({
                            "id": data['id'],
                            "title": data['name'],
                            "path": install_dir,
                            "platform": "Steam",
                            "cover": f"https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{data['id']}/library_600x900.jpg"
                        })
    
    # If no games found via manifests, try scanning 'common' folder directly as fallback
    if not games and os.path.exists(os.path.join(steamapps_path, "common")):
         common_path = os.path.join(steamapps_path, "common")
         for item in os.listdir(common_path):
            full_path = os.path.join(common_path, item)
            if os.path.isdir(full_path):
                games.append({
                    "id": item,
                    "title": item,
                    "path": full_path,
                    "platform": "Steam",
                    "cover": None
                })

    return games

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
