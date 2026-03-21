const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GOOGLE_TTS_KEY = process.env.GOOGLE_TTS_KEY;

// ── KIDS Q&A ──────────────────────────────────────────────────────────────────
app.post('/ask', async (req, res) => {
  const { question } = req.body;
  if (!question || question.trim().length === 0) return res.status(400).json({ error: 'No question provided' });
  if (question.length > 500) return res.status(400).json({ error: 'Question too long' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: `You are a friendly enthusiastic guide helping two children learn about Spain and Andalusia during a family holiday. Ellie is 9 and Jacob is 6. Answer questions in a fun simple age-appropriate way using short sentences interesting facts and occasional emojis. Keep answers under 100 words. Focus on things they can see and do in Málaga Córdoba and Granada. Never discuss anything inappropriate. If asked something unrelated to the holiday or Spain gently redirect back to holiday topics.`,
        messages: [{ role: 'user', content: question }]
      })
    });
    const data = await response.json();
    if (data.content && data.content[0]) {
      res.json({ answer: data.content[0].text });
    } else {
      res.status(500).json({ error: 'No response from AI' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ── GOOGLE CLOUD TEXT-TO-SPEECH ───────────────────────────────────────────────
app.post('/tts', async (req, res) => {
  const { text } = req.body;
  if (!text || text.trim().length === 0) return res.status(400).json({ error: 'No text provided' });
  if (text.length > 1000) return res.status(400).json({ error: 'Text too long' });

  // Strip emojis before sending to TTS
  const cleaned = text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')
    .replace(/[\u{2600}-\u{27BF}]/gu, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\uFE0F/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_TTS_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: cleaned },
          voice: {
            languageCode: 'en-GB',
            name: 'en-GB-Neural2-B',  // warm natural British male voice
            ssmlGender: 'MALE'
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 0.95,
            pitch: 0.0
          }
        })
      }
    );
    const data = await response.json();
    if (data.audioContent) {
      res.json({ audio: data.audioContent }); // base64 MP3
    } else {
      console.error('TTS error:', data);
      res.status(500).json({ error: 'TTS failed', detail: data.error?.message });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'TTS request failed' });
  }
});

// ── TODAY'S HOLIDAY DAY (for Apple Watch Shortcut) ───────────────────────────
app.get('/today', (req, res) => {
  const now = new Date();
  // Use Spain timezone (CEST = UTC+2 in April)
  const spainOffset = 2 * 60;
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const spain = new Date(utc + spainOffset * 60000);

  const tripStart = new Date('2026-04-04');
  tripStart.setHours(0, 0, 0, 0);
  const today = new Date(spain);
  today.setHours(0, 0, 0, 0);

  const diffMs = today - tripStart;
  const dayNum = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;

  const days = {
    1: `✈️ DAY 1 — MÁLAGA
Depart Luton 16:10 · FR6649
Arrive Málaga 20:05
Staying: B&B Hotel Centro
Ref: 6136809407 · Pay €297 on arrival
Address: Av. Fátima 7-9
No bookings — settle in and explore!
🆘 Emergency: 112`,

    2: `🌞 DAY 2 — MÁLAGA → CÓRDOBA
Train 02153 departs 14:56
Arrives Córdoba 15:43
Morning free in Málaga
Staying: Airbnb — Plaza de Santa Catalina
Ref: HMWK8SE58F
Check app for entry code
🆘 Emergency: 112`,

    3: `🕌 DAY 3 — CÓRDOBA
✅ Mezquita: 10:00 BOOKED
Ref: 95794322
⚠️ Alcázar CLOSED Mondays
Dress code: shoulders + knees covered
Staying: Airbnb (same as last night)
🆘 Emergency: 112`,

    4: `🚂 DAY 4 — CÓRDOBA → GRANADA
Train 08335 departs 13:06
Arrives Granada 14:51
Staying: Bibo Suites Palacio de Pórtago
Ref: 27251400
Tel: +34 958 48 00 09
⚠️ Online check-in required before arrival
🆘 Emergency: 112`,

    5: `🔭 DAY 5 — GRANADA
Science Park: 10:00 walk-up
Bus 21 from Plaza del Carmen
✅ FLAMENCO: 18:00 BOOKED
Ref: 95798502 · Arrive by 17:30
Jardines de Zoraya, Albaicín
🆘 Emergency: 112`,

    6: `🏛️ DAY 6 — FREE DAY GRANADA
No bookings today
Explore: Capilla Real, Bib-Rambla
Los Italianos ice cream 🍦
Staying: Bibo Suites (same)
🆘 Emergency: 112`,

    7: `🏰 DAY 7 — THE ALHAMBRA
⚠️ PASSPORTS REQUIRED
Arrive: 13:00
✅ Nasrid Palaces: 17:30 BOOKED
Ref: H0LXLYO/1
Order: 2020400LXLYO
Evening: Bodegas Castañeda dinner
🆘 Emergency: 112`,

    8: `✈️ DAY 8 — TRAVEL HOME
Train 08915 departs 07:36
Arrives Málaga 09:00
Take C1 bus to airport
Flight FR6648 departs 13:55
Arrives Luton 15:45
Safe travels! 🏡
🆘 Emergency: 112`
  };

  if (dayNum < 1 || dayNum > 8) {
    const pre = dayNum < 1;
    res.set('Content-Type', 'text/plain');
    res.send(pre
      ? `⏳ Holiday hasn't started yet!\nDeparture: Saturday 4 April, Luton 16:10\nFlight: FR6649\n🆘 Emergency: 112`
      : `🏡 Holiday is over — hope it was amazing!\n🆘 Emergency: 112`
    );
  } else {
    res.set('Content-Type', 'text/plain');
    res.send(days[dayNum]);
  }
});

app.get('/', (req, res) => res.json({ status: 'Andalusia 2026 backend running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
