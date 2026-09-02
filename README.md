# Loomtale

An interactive AI-powered storytelling app. Describe a world and a role, then step into the story.

## Project Structure

```
loomtale/
  index.html   - Main app UI and styles
  app.js       - Story logic, API calls, rendering
  README.md    - This file
```

## Setup

1. Get an Anthropic API key from https://console.anthropic.com
2. Open `index.html` in your browser
3. The app will ask for your API key on first run (stored in localStorage)

## How it Works

- You describe a premise (world, role, mood)
- The AI (Claude) narrates the story and voices all other characters
- The background subtly shifts color based on the scene mood
- Each character gets a unique color and avatar
