const TABLE = 'lotto_draws';
const DEFAULT_LIMIT = 50;

function normalizeSupabaseUrl(raw) {
  if (!raw || typeof raw !== 'string') return null;

  const trimmed = raw.trim();
  if (!trimmed) return null;

  // DB 연결 문자열 등 잘못된 값 방지
  if (trimmed.startsWith('postgres://') || trimmed.startsWith('postgresql://')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    // Dashboard에서 REST endpoint 전체를 붙여넣어도 origin만 사용
    // 예: https://xxx.supabase.co/rest/v1 → https://xxx.supabase.co
    return parsed.origin;
  } catch {
    return null;
  }
}

function getSupabaseConfig() {
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL);
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return { url, key };
}

function validateNumbers(raw) {
  if (!Array.isArray(raw) || raw.length !== 6) return null;
  const nums = [...new Set(raw.map((n) => Number(n)).filter((n) => Number.isInteger(n) && n >= 1 && n <= 45))];
  if (nums.length !== 6) return null;
  return nums.sort((a, b) => a - b);
}

function validateTickets(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 10) return null;
  const tickets = raw.map((ticket) => validateNumbers(ticket));
  if (tickets.some((t) => !t)) return null;
  return tickets;
}

async function supabaseRequest(path, { method = 'GET', body, prefer } = {}) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    throw new Error('SUPABASE_URL 및 SUPABASE_SERVICE_ROLE_KEY(또는 SUPABASE_ANON_KEY)가 필요합니다.');
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Profile': 'public',
    'Content-Profile': 'public',
  };

  if (prefer) headers.Prefer = prefer;

  const requestUrl = `${url}/rest/v1/${path}`;
  const res = await fetch(requestUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const code = data?.code;
    const baseMessage =
      data?.message ||
      data?.error ||
      (typeof data === 'string' ? data : `Supabase 오류 (${res.status})`);

    if (code === 'PGRST125' || /invalid path/i.test(baseMessage)) {
      throw new Error(
        'Supabase URL 경로가 올바르지 않습니다. SUPABASE_URL은 https://프로젝트ID.supabase.co 형식만 사용하세요. (/rest/v1 붙이지 마세요.) supabase/schema.sql로 lotto_draws 테이블도 생성했는지 확인해 주세요.',
      );
    }

    if (code === 'PGRST205' || /schema cache/i.test(baseMessage)) {
      throw new Error(
        'lotto_draws 테이블을 찾을 수 없습니다. Supabase SQL Editor에서 supabase/schema.sql을 실행해 주세요.',
      );
    }

    throw new Error(baseMessage);
  }

  return data;
}

async function saveTickets(tickets) {
  const batchId = crypto.randomUUID();
  const rows = tickets.map((numbers, index) => ({
    numbers,
    ticket_index: index + 1,
    batch_id: batchId,
  }));

  const saved = await supabaseRequest(TABLE, {
    method: 'POST',
    body: rows,
    prefer: 'return=representation',
  });

  return { batchId, saved };
}

async function listDraws(limit = DEFAULT_LIMIT) {
  const safeLimit = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), 100);
  const query = new URLSearchParams({
    select: 'id,numbers,ticket_index,batch_id,created_at',
    order: 'created_at.desc',
    limit: String(safeLimit),
  });

  return supabaseRequest(`${TABLE}?${query.toString()}`);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    const rawUrl = process.env.SUPABASE_URL?.trim();
    const urlHint = rawUrl?.startsWith('postgres')
      ? ' SUPABASE_URL에 DB 연결 문자열이 아닌 Project URL(https://xxx.supabase.co)을 넣어 주세요.'
      : ' SUPABASE_URL은 https://프로젝트ID.supabase.co 형식이어야 합니다.';

    return res.status(500).json({
      error: `Supabase가 설정되지 않았습니다.${urlHint} SUPABASE_SERVICE_ROLE_KEY도 Vercel Environment Variables에 추가하고 supabase/schema.sql을 실행해 주세요.`,
    });
  }

  try {
    if (req.method === 'GET') {
      const limit = req.query?.limit;
      const draws = await listDraws(limit);
      return res.status(200).json({ draws });
    }

    if (req.method === 'POST') {
      const tickets = validateTickets(req.body?.tickets);
      if (!tickets) {
        return res.status(400).json({
          error: 'tickets 배열이 필요합니다. 각 항목은 1~45 중복 없는 6개 번호입니다.',
        });
      }

      const { batchId, saved } = await saveTickets(tickets);
      return res.status(201).json({ batchId, saved });
    }

    return res.status(405).json({ error: 'GET, POST만 지원합니다.' });
  } catch (err) {
    console.error('lotto-draws error:', err);
    return res.status(500).json({ error: err.message || '서버 오류가 발생했습니다.' });
  }
};
