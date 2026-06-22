const MODEL = 'gemini-2.5-flash';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    numbers: {
      type: 'array',
      items: { type: 'integer' },
      description: '로또 6/45 추천 번호 6개 (1~45, 중복 없음, 오름차순)',
    },
    sajuSummary: {
      type: 'string',
      description: '생년월일·성별 기반 사주 요약 (2~3문장)',
    },
    numberReasons: {
      type: 'array',
      items: { type: 'string' },
      description: 'numbers 순서와 동일한, 번호별 사주 근거 한 줄 설명 6개',
    },
    explanation: {
      type: 'string',
      description: '번호 조합을 추천한 전체 사주적 이유 (3~6문장)',
    },
    reply: {
      type: 'string',
      description: '사용자에게 전달할 친절한 한국어 답변',
    },
  },
  required: ['numbers', 'sajuSummary', 'numberReasons', 'explanation', 'reply'],
};

function buildSystemPrompt({ gender, birthDate }) {
  return `당신은 한국 사주(四柱)와 로또 6/45 번호 상담을 돕는 전문가입니다.

사용자 프로필:
- 성별: ${gender === 'male' ? '남성' : '여성'}
- 생년월일: ${birthDate} (양력, 출생시간 미입력)

규칙:
1. 사주는 생년월일(년·월·일주) 중심으로 해석하고, 시주는 미입력임을 밝히세요.
2. 로또 번호는 1~45 정수 6개, 중복 없이 오름차순으로 추천하세요.
3. 오행(목·화·토·금·수), 용신·희신, 십성, 숫자 상징 등 사주 관점으로 근거를 제시하세요.
4. 번호 추천·해석은 오락·참고용이며, 당첨을 보장하지 않음을 암시하세요.
5. numberReasons는 numbers 배열과 같은 순서·개수(6개)로, 각 번호마다 오행·십성·용신 등 구체적 근거를 한 문장 이상 작성하세요.
6. explanation에는 번호 조합 전체의 사주적 의미와 상호 관계를 4문장 이상 자세히 작성하세요.
7. sajuSummary에는 년·월·일주 특성과 성별을 반영한 사주 성향을 2~4문장 작성하세요.
8. 모든 텍스트는 자연스러운 한국어로 작성하세요.`;
}

function buildUserPrompt(message, isInitial) {
  if (isInitial) {
    return `${message}\n\n위 사용자의 사주에 맞는 로또 6/45 번호 6개를 추천하고, JSON 스키마에 맞게 응답하세요.`;
  }
  return `${message}\n\n가능하면 사주 관점을 유지하며 답변하고, 새 번호를 제안할 때는 numbers·numberReasons도 함께 갱신하세요. JSON 스키마에 맞게 응답하세요.`;
}

function normalizeNumbers(raw) {
  if (!Array.isArray(raw)) return null;
  const nums = [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 45))];
  if (nums.length !== 6) return null;
  return nums.sort((a, b) => a - b);
}

function parseGeminiJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI 응답을 JSON으로 해석하지 못했습니다.');
  }
}

async function callGemini(apiKey, contents) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.85,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API 오류 (${res.status})`;
    throw new Error(msg);
  }

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('AI 응답이 비어 있습니다.');

  return parseGeminiJson(text);
}

function buildContents({ gender, birthDate, message, history, isInitial }) {
  const system = buildSystemPrompt({ gender, birthDate });
  const contents = [{ role: 'user', parts: [{ text: system }] }];

  if (Array.isArray(history)) {
    history.forEach((item) => {
      if (!item?.role || !item?.text) return;
      contents.push({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.text }],
      });
    });
  }

  contents.push({
    role: 'user',
    parts: [{ text: buildUserPrompt(message, isInitial) }],
  });

  return contents;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 지원합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY가 설정되지 않았습니다. Vercel 프로젝트 Settings → Environment Variables에 추가해 주세요.',
    });
  }

  try {
    const { gender, birthDate, message, history, isInitial } = req.body ?? {};

    if (!gender || !['male', 'female'].includes(gender)) {
      return res.status(400).json({ error: '성별(male/female)을 선택해 주세요.' });
    }

    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      return res.status(400).json({ error: '생년월일(YYYY-MM-DD)을 입력해 주세요.' });
    }

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: '메시지가 필요합니다.' });
    }

    const contents = buildContents({
      gender,
      birthDate,
      message,
      history,
      isInitial: Boolean(isInitial),
    });

    const parsed = await callGemini(apiKey, contents);
    const numbers = normalizeNumbers(parsed.numbers);

    if (!numbers) {
      return res.status(502).json({ error: 'AI가 유효한 로또 번호 6개를 생성하지 못했습니다. 다시 시도해 주세요.' });
    }

    return res.status(200).json({
      numbers,
      sajuSummary: parsed.sajuSummary || '',
      numberReasons: Array.isArray(parsed.numberReasons) ? parsed.numberReasons.slice(0, 6) : [],
      explanation: parsed.explanation || '',
      reply: parsed.reply || parsed.explanation || '',
    });
  } catch (err) {
    console.error('saju-chat error:', err);
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};
