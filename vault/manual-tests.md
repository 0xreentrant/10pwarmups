# Manual tests

- [ ] Open `/tagger` signed out in a fresh tab. The browser goes to Google before the tagger editor appears. After an allowed account, the editor loads. A non-admin account stays on the error screen.
- [ ] Log out of the tagger. The sign-in link stays up. Refresh does not sign you back in. Sign in with Google still opens Google.
- [ ] Open D4 review. The clip is the 10pwarmups post (about 65s), and the Instagram link is `https://www.instagram.com/p/DXI6R7JE4d1/`.
- [ ] Open A1 review and a train round. A still of the frame shows with a spinner, then the video replaces it and the spinner is gone.
- [ ] Scrub a warmup in train or review. Seeking uses a normal network response. The service worker does not cache the mp4.
