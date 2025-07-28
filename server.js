import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, 'config.json');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

app.post('/api/analyze', async (req, res) => {
  try {
    const { apiKey, images, prompt } = req.body;
    
    if (!apiKey || !images || images.length === 0) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const content = [
      {
        type: "text",
        text: prompt
      },
      ...images
    ];

    const message = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: content
        }
      ],
    });

    res.json({ analysis: message.content[0].text });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze screenshots' });
  }
});

// Get config endpoint
app.get('/api/config', async (req, res) => {
  try {
    if (await fs.pathExists(CONFIG_FILE)) {
      const config = await fs.readJson(CONFIG_FILE);
      res.json(config);
    } else {
      res.json({ apiKey: '' });
    }
  } catch (error) {
    console.error('Error reading config:', error);
    res.json({ apiKey: '' });
  }
});

// Save config endpoint
app.post('/api/config', async (req, res) => {
  try {
    const { apiKey } = req.body;
    await fs.writeJson(CONFIG_FILE, { apiKey }, { spaces: 2 });
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving config:', error);
    res.status(500).json({ error: 'Failed to save configuration' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});