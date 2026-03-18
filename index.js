const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

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
        system: `You are a friendly enthusiastic guide helping two children learn about Spain and Andalusia during a family holiday. Ellie is 6 and Jacob is 9. Answer questions in a fun simple age-appropriate way using short sentences interesting facts and occasional emojis. Keep answers under 100 words. Focus on things they can see and do in Málaga Córdoba and Granada. Never discuss anything inappropriate. If asked something unrelated to the holiday or Spain gently redirect back to holiday topics.`,
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

app.get('/', (req, res) => res.json({ status: 'Andalusia 2026 backend running' }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
