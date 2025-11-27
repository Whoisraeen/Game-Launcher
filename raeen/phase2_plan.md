# Phase 2: Interactivity & Metadata

## Goal
Make the games playable and visually rich.

## Step 1: Game Launching
- **Backend**: Add `POST /play/{game_id}` endpoint.
  - Logic: Use `os.startfile(f"steam://run/{game_id}")` for Steam games. This is the standard way to launch Steam games on Windows.
- **Frontend**: Connect the "Play" button in `GameGrid` to this endpoint.

## Step 2: Cover Art
- **Backend**: Update `/games` response to include `cover_url`.
  - Logic: Construct URL `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/{appid}/library_600x900.jpg`.
- **Frontend**: Update `GameGrid` to display these images instead of the placeholder gradient. Handle 404s (fallback to title).

## Step 3: UI Polish (Visual Fidelity)
- **Glassmorphism**: Ensure the sidebar and cards have the correct `backdrop-filter`, border opacity, and noise texture if visible in the reference.
- **Animations**: Add smooth hover states for cards (scale up, glow).
