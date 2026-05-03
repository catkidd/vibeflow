// FILE: backend/src/config/spotify.ts
// Spotify API client configuration — uses spotify-web-api-node.
// Handles access/refresh tokens and API requests for mood-aware curation.

import SpotifyWebApi from "spotify-web-api-node";
import dotenv from "dotenv";

dotenv.config();

/**
 * createSpotifyApi
 * Returns a new instance of the Spotify API client.
 * Uses environment variables for client ID, secret, and redirect URI.
 */
export function createSpotifyApi() {
  return new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
    redirectUri:
      process.env.SPOTIFY_REDIRECT_URI ||
      "http://localhost:4000/api/spotify/callback",
  });
}

/**
 * SCOPES
 * Permissions required for VibeFlow to curate and play music.
 */
export const SPOTIFY_SCOPES = [
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
  "streaming",
  "app-remote-control",
  "playlist-read-private",
  "playlist-read-collaborative",
  "user-top-read",
];
