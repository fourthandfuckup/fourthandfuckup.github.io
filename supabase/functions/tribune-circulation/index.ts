
import { createClient } from "npm:@supabase/supabase-js@2.57.0";

const allowedOrigins = new Set(["https://fourthandfuckup.com", "https://www.fourthandfuckup.com", "https://fourthandfuckup.github.io"]);
const corsFor = (request: Request) => {
  const origin = request.headers.get("Origin") ?? "";
  return allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
};

const cors = {
  
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};


function base64url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function encodeJson(value: unknown) {
  return base64url(
    new TextEncoder().encode(JSON.stringify(value))
  );
}

async function getGoogleToken(credentials: {
  client_email: string;
  private_key: string;
}) {
  const now = Math.floor(Date.now() / 1000);

  const header = encodeJson({
    alg: "RS256",
    typ: "JWT",
  });

  const payload = encodeJson({
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  });

  const unsigned = `${header}.${payload}`;

  const pem = credentials.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");

  const binary = atob(pem);
  const keyBytes = Uint8Array.from(binary, c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      key,
      new TextEncoder().encode(unsigned)
    )
  );

  const assertion = `${unsigned}.${base64url(signature)}`;

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Google authentication failed");
  }

  const result = await response.json();
  return result.access_token as string;
}

Deno.serve(async request => {
  const requestCors = { ...cors, ...corsFor(request) };
  const reply = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: requestCors });
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: requestCors });
  }

  if (request.method !== "POST") {
    return reply({ error: "Method not allowed" }, 405);
  }

  try {
    const authorization = request.headers.get("Authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return reply({ error: "Sign-in required" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey =
      Deno.env.get("SUPABASE_ANON_KEY") ??
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authorization },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const token = authorization.slice(7);

    const { data: userData, error: userError } =
      await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return reply({ error: "Invalid sign-in" }, 401);
    }

    const { data: editor, error: editorError } =
      await supabase
        .from("tribune_editors")
        .select("user_id")
        .eq("user_id", userData.user.id)
        .maybeSingle();

    if (editorError || !editor) {
      return reply({ error: "Editor access required" }, 403);
    }

    const rawCredentials =
      Deno.env.get("GOOGLE_ANALYTICS_CREDENTIALS");
    const propertyId = Deno.env.get("GA4_PROPERTY_ID");

    if (!rawCredentials || !propertyId) {
      throw new Error("Google Analytics configuration missing");
    }

    const credentials = JSON.parse(rawCredentials);
    const accessToken = await getGoogleToken(credentials);

    async function report(body: unknown) {
      const response = await fetch(
        `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Google Analytics request failed (${response.status})`
        );
      }

      return await response.json();
    }

    const input = await request.json().catch(() => ({}));
    const period = ['7d', '30d', 'all', 'compare30'].includes(input?.period) ? input.period : '30d';
    const ranges = {
      '7d': [{ startDate: '6daysAgo', endDate: 'today' }],
      '30d': [{ startDate: '29daysAgo', endDate: 'today' }],
      'all': [{ startDate: '2020-01-01', endDate: 'today' }],
      'compare30': [
        { startDate: '29daysAgo', endDate: 'today' },
        { startDate: '59daysAgo', endDate: '30daysAgo' }
      ]
    };
    const dateRanges = ranges[period];
    const summary = await report({
      dateRanges,
      ...(period === 'compare30' ? { dimensions: [{ name: 'dateRange' }] } : {}),
      metrics: [
        { name: "activeUsers" },
        { name: "screenPageViews" },
        { name: "sessions" },
      ],
    });

    const pages = await report({
      dateRanges: [dateRanges[0]],
      dimensions: [
        { name: "pageTitle" },
      ],
      metrics: [
        { name: "screenPageViews" },
      ],
      orderBys: [
        {
          metric: { metricName: "screenPageViews" },
          desc: true,
        },
      ],
      limit: "10",
    });

    const summaryRows = summary.rows ?? [];
    const currentRow = summaryRows.find((row: any) => row.dimensionValues?.[0]?.value === 'date_range_0') ?? summaryRows[0];
    const previousRow = summaryRows.find((row: any) => row.dimensionValues?.[0]?.value === 'date_range_1');
    const values = currentRow?.metricValues ?? [];
    const previousValues = previousRow?.metricValues ?? [];
    const previous = period === 'compare30' ? {
      activeUsers: Number(previousValues[0]?.value ?? 0),
      pageViews: Number(previousValues[1]?.value ?? 0),
      sessions: Number(previousValues[2]?.value ?? 0)
    } : null;

    return reply({
      department: "Tribune Circulation",
      status: "connected",
      period: ({ '7d': 'Last 7 days', '30d': 'Last 30 days', all: 'All time', compare30: '30-day comparison' })[period],
      previous,
      activeUsers: Number(values[0]?.value ?? 0),
      pageViews: Number(values[1]?.value ?? 0),
      sessions: Number(values[2]?.value ?? 0),
      popularPages: (pages.rows ?? []).map(
        (row: any) => ({
          title: row.dimensionValues?.[0]?.value ?? "Untitled",
          views: Number(row.metricValues?.[0]?.value ?? 0),
        })
      ),
    });
  } catch (error) {
    console.error("Circulation reporting error:", error);
    return reply(
      { error: "Unable to retrieve circulation reports" },
      500
    );
  }
});
