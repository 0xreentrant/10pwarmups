# Manual tests

- [ ] Run `pnpm run dev:tailscale`. `https://warmups.tail965c07.ts.net` opens the app with no port in the URL.
- [ ] Open `/tagger` with no token, or with an expired one. The sign-in screen stays up. Google opens only after Sign in with Google. After an allowed account, the editor loads. A non-admin account stays on the error screen.
- [ ] Log out of the tagger. The sign-in link stays up. Refresh does not sign you back in. Sign in with Google still opens Google.
- [ ] Open D4 review. The clip is the 10pwarmups post (about 65s), and the Instagram link is `https://www.instagram.com/p/DXI6R7JE4d1/`.
- [ ] Open A1 review and a train round. A still of the frame shows with a spinner, then the video replaces it and the spinner is gone.
- [ ] Scrub a warmup in train or review. Seeking uses a normal network response. The service worker does not cache the mp4.
- [ ] In the tagger, move a marker and reload. The marker is still where you left it.
- [ ] Add a move, reload, and the added move is still there. Reset, and the catalog move count and timestamps are back.
- [ ] Save the tagger JSON, reload, and the saved values show with no leftover draft.
- [ ] Start a Save, add another move before it finishes, and reload. The newer move is still there.
- [ ] In a fresh profile with the network off, the home screen says Catalog unavailable.
- [ ] Load the app once online, then reload with the network off. The schedule is still there, including an A1 Train row.
