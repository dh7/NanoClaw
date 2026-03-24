import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { WAMessage, WASocket } from '@whiskeysockets/baileys';

import { readEnvFile } from './env.js';

interface TranscriptionConfig {
  model: string;
  baseUrl?: string;
  enabled: boolean;
  fallbackMessage: string;
}

function normalizeBaseUrl(baseUrl?: string): string | undefined {
  if (!baseUrl) return undefined;
  return baseUrl.replace(/\/+$/, '');
}

function isOpenAIAdapter(baseUrl?: string): boolean {
  const url = normalizeBaseUrl(baseUrl);
  return !!url && /\/v1$/.test(url);
}

function loadConfig(): TranscriptionConfig {
  const env = readEnvFile(['OPENAI_MODEL', 'OPENAI_BASE_URL']);
  return {
    model: env.OPENAI_MODEL || 'whisper-1',
    baseUrl: env.OPENAI_BASE_URL || undefined,
    enabled: true,
    fallbackMessage: '[Voice Message - transcription unavailable]',
  };
}

async function transcribeWithOpenAI(
  audioBuffer: Buffer,
  config: TranscriptionConfig,
): Promise<string | null> {
  const env = readEnvFile(['OPENAI_API_KEY']);
  const apiKey = env.OPENAI_API_KEY || (config.baseUrl ? 'dummy' : '');

  if (!apiKey) {
    console.warn('OPENAI_API_KEY not set in .env');
    return null;
  }

  try {
    const openaiModule = await import('openai');
    const OpenAI = openaiModule.default;
    const toFile = openaiModule.toFile;

    const openai = new OpenAI({
      apiKey,
      baseURL: config.baseUrl,
    });

    const file = await toFile(audioBuffer, 'voice.ogg', {
      type: 'audio/ogg',
    });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: config.model,
      response_format: 'text',
    });

    // When response_format is 'text', the API returns a plain string
    return transcription as unknown as string;
  } catch (err) {
    console.error('OpenAI transcription failed:', err);
    return null;
  }
}

async function transcribeWithWhisperXDirect(
  audioBuffer: Buffer,
  config: TranscriptionConfig,
): Promise<string | null> {
  const baseUrl = normalizeBaseUrl(config.baseUrl);
  if (!baseUrl) return null;

  try {
    const form = new FormData();
    const file = new File([audioBuffer], 'voice.ogg', { type: 'audio/ogg' });
    form.append('file', file);
    form.append('language', 'auto');

    const res = await fetch(`${baseUrl}/transcribe`, {
      method: 'POST',
      body: form,
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('WhisperX direct transcription failed:', res.status, body);
      return null;
    }

    const data = (await res.json()) as {
      text?: string;
      segments?: Array<{ text?: string }>;
    };

    if (typeof data.text === 'string' && data.text.trim().length > 0) {
      return data.text;
    }

    if (Array.isArray(data.segments) && data.segments.length > 0) {
      const joined = data.segments
        .map((s) => (s.text || '').trim())
        .filter(Boolean)
        .join(' ')
        .trim();
      return joined.length > 0 ? joined : null;
    }

    return null;
  } catch (err) {
    console.error('WhisperX direct transcription error:', err);
    return null;
  }
}

export async function transcribeAudioMessage(
  msg: WAMessage,
  sock: WASocket,
): Promise<string | null> {
  const config = loadConfig();

  if (!config.enabled) {
    return config.fallbackMessage;
  }

  try {
    const buffer = (await downloadMediaMessage(
      msg,
      'buffer',
      {},
      {
        logger: console as any,
        reuploadRequest: sock.updateMediaMessage,
      },
    )) as Buffer;

    if (!buffer || buffer.length === 0) {
      console.error('Failed to download audio message');
      return config.fallbackMessage;
    }

    console.log(`Downloaded audio message: ${buffer.length} bytes`);

    const transcript = isOpenAIAdapter(config.baseUrl)
      ? await transcribeWithOpenAI(buffer, config)
      : await transcribeWithWhisperXDirect(buffer, config);

    if (!transcript) {
      return config.fallbackMessage;
    }

    return transcript.trim();
  } catch (err) {
    console.error('Transcription error:', err);
    return config.fallbackMessage;
  }
}

export function isVoiceMessage(msg: WAMessage): boolean {
  return msg.message?.audioMessage?.ptt === true;
}
