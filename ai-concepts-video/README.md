# The 22 main concepts of AI — explained simply (video)

`ai-concepts-explained.mp4` — a 17-minute narrated, captioned 1080p video that walks through all 22 concepts.
Each concept gets: a one-line analogy, three key points, and a takeaway for a Chief AI Product Officer.
Chapter timestamps are in `chapters.txt`.

To change the wording, edit `content.js` and rebuild (needs Node + Playwright, ffmpeg, and `festival` + `festvox-us-slt-hts`):

    node build.js            # slides + narration are cached in ./build; FRESH=1 to regenerate
