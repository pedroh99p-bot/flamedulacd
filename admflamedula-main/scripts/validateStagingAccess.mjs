import { randomUUID } from 'node:crypto';

const STAGING_PROJECT_REF = 'gimugfooncsmyztjuull';
const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl?.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing to test outside staging ${STAGING_PROJECT_REF}.`);
}

if (!publishableKey || !serviceRoleKey) {
  throw new Error('SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY are required.');
}

const runId = randomUUID();
const password = `Fla-${randomUUID()}-Aa1!`;
const users = [];
let contentId = null;

const adminHeaders = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  'content-type': 'application/json',
};

async function request(path, options = {}) {
  return fetch(`${supabaseUrl}${path}`, options);
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function createTestUser(label, globalRole, cmsRole) {
  const response = await request('/auth/v1/admin/users', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({
      email: `codex-${label}-${runId}@example.invalid`,
      password,
      email_confirm: true,
      user_metadata: { staging_test: true },
    }),
  });
  const user = await readJson(response);
  assert(response.ok && user?.id, `Unable to create ${label} test user (${response.status}).`);
  users.push({ label, id: user.id, email: user.email });

  const profileResponse = await request('/rest/v1/admin_profiles', {
    method: 'POST',
    headers: { ...adminHeaders, prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: user.id,
      full_name: `Codex staging ${label}`,
      role: globalRole,
      active: true,
    }),
  });
  assert(profileResponse.ok, `Unable to create ${label} admin profile (${profileResponse.status}).`);

  const accessResponse = await request('/rest/v1/admin_app_access', {
    method: 'POST',
    headers: { ...adminHeaders, prefer: 'return=minimal' },
    body: JSON.stringify({
      user_id: user.id,
      app_code: 'cms',
      access_role: cmsRole,
      active: true,
    }),
  });
  assert(accessResponse.ok, `Unable to create ${label} CMS access (${accessResponse.status}).`);
  return users.at(-1);
}

async function signIn(user) {
  const response = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: publishableKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email: user.email, password }),
  });
  const session = await readJson(response);
  assert(response.ok && session?.access_token, `Unable to sign in ${user.label} (${response.status}).`);
  return session.access_token;
}

function userHeaders(token, prefer = '') {
  const headers = {
    apikey: publishableKey,
    authorization: `Bearer ${token}`,
    'content-type': 'application/json',
  };
  if (prefer) headers.prefer = prefer;
  return headers;
}

async function deleteTestUserData(user) {
  const accessDelete = await request(`/rest/v1/admin_app_access?user_id=eq.${user.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(accessDelete.ok, `Unable to delete ${user.email} CMS access (${accessDelete.status}).`);

  const profileDelete = await request(`/rest/v1/admin_profiles?user_id=eq.${user.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(profileDelete.ok, `Unable to delete ${user.email} profile (${profileDelete.status}).`);

  const auditDelete = await request(`/rest/v1/audit_logs?admin_user_id=eq.${user.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(auditDelete.ok, `Unable to delete ${user.email} test audit logs (${auditDelete.status}).`);

  const authDelete = await request(`/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: adminHeaders,
  });
  assert(authDelete.ok, `Unable to delete ${user.email} Auth user (${authDelete.status}).`);
}

async function cleanup() {
  if (contentId) {
    await request(`/rest/v1/hero_news?id=eq.${contentId}`, {
      method: 'DELETE',
      headers: adminHeaders,
    });
  }

  for (const user of users.toReversed()) {
    await deleteTestUserData(user);
  }
}

async function cleanupStaleTestUsers() {
  const response = await request('/auth/v1/admin/users?page=1&per_page=1000', {
    headers: adminHeaders,
  });
  const payload = await readJson(response);
  assert(response.ok, `Unable to list stale test users (${response.status}).`);

  const staleUsers = (payload?.users || []).filter((user) =>
    user.user_metadata?.staging_test === true
      && user.email?.startsWith('codex-')
      && user.email?.endsWith('@example.invalid'),
  );

  for (const user of staleUsers) {
    await deleteTestUserData(user);
  }
}

try {
  await cleanupStaleTestUsers();
  const owner = await createTestUser('owner', 'admin', 'owner');
  const editor = await createTestUser('editor', 'admin', 'editor');
  const viewer = await createTestUser('viewer', 'viewer', 'viewer');

  const [ownerToken, editorToken, viewerToken] = await Promise.all([
    signIn(owner),
    signIn(editor),
    signIn(viewer),
  ]);

  const viewerCreate = await request('/rest/v1/hero_news', {
    method: 'POST',
    headers: userHeaders(viewerToken, 'return=representation'),
    body: JSON.stringify({ title: `Viewer escalation ${runId}`, published: false }),
  });
  assert(!viewerCreate.ok, `Viewer unexpectedly created content (${viewerCreate.status}).`);

  const editorCreate = await request('/rest/v1/hero_news', {
    method: 'POST',
    headers: userHeaders(editorToken, 'return=representation'),
    body: JSON.stringify({ title: `RBAC staging ${runId}`, published: false }),
  });
  const createdRows = await readJson(editorCreate);
  contentId = createdRows?.[0]?.id;
  assert(editorCreate.ok && contentId, `Editor could not create content (${editorCreate.status}).`);

  const anonymousDraft = await request(`/rest/v1/hero_news?id=eq.${contentId}&select=id`, {
    headers: { apikey: publishableKey },
  });
  const anonymousRows = await readJson(anonymousDraft);
  assert(anonymousDraft.ok && Array.isArray(anonymousRows) && anonymousRows.length === 0, 'Anonymous user read a draft.');

  const viewerDraft = await request(`/rest/v1/hero_news?id=eq.${contentId}&select=id`, {
    headers: userHeaders(viewerToken),
  });
  const viewerRows = await readJson(viewerDraft);
  assert(viewerDraft.ok && viewerRows?.[0]?.id === contentId, 'Viewer could not read a draft.');

  const viewerUpdate = await request(`/rest/v1/hero_news?id=eq.${contentId}`, {
    method: 'PATCH',
    headers: userHeaders(viewerToken, 'return=representation'),
    body: JSON.stringify({ title: `Viewer changed ${runId}` }),
  });
  const viewerUpdatedRows = await readJson(viewerUpdate);
  assert(viewerUpdate.ok && Array.isArray(viewerUpdatedRows) && viewerUpdatedRows.length === 0, 'Viewer unexpectedly updated content.');

  const editorDelete = await request(`/rest/v1/hero_news?id=eq.${contentId}`, {
    method: 'DELETE',
    headers: userHeaders(editorToken, 'return=representation'),
  });
  const editorDeletedRows = await readJson(editorDelete);
  assert(editorDelete.ok && Array.isArray(editorDeletedRows) && editorDeletedRows.length === 0, 'Editor unexpectedly deleted content.');

  const ownerDelete = await request(`/rest/v1/hero_news?id=eq.${contentId}`, {
    method: 'DELETE',
    headers: userHeaders(ownerToken, 'return=representation'),
  });
  const ownerDeletedRows = await readJson(ownerDelete);
  assert(ownerDelete.ok && ownerDeletedRows?.[0]?.id === contentId, 'Owner could not delete content.');
  contentId = null;

  const viewerFunction = await request('/functions/v1/generate-cloudinary-signature', {
    method: 'POST',
    headers: userHeaders(viewerToken),
    body: JSON.stringify({ target: 'hero', resourceType: 'image', paramsToSign: { timestamp: 1 } }),
  });
  assert(viewerFunction.status === 403, `Viewer function access returned ${viewerFunction.status}, expected 403.`);

  const ownerFunction = await request('/functions/v1/generate-cloudinary-signature', {
    method: 'POST',
    headers: userHeaders(ownerToken),
    body: JSON.stringify({
      target: 'hero',
      resourceType: 'image',
      paramsToSign: { timestamp: Math.round(Date.now() / 1000) },
    }),
  });
  const ownerSignature = await readJson(ownerFunction);
  assert(ownerFunction.ok, `Owner function access returned ${ownerFunction.status}, expected 200.`);
  assert(
    ownerSignature?.signature
      && ownerSignature?.apiKey
      && ownerSignature?.cloudName
      && ownerSignature?.folder === 'flamedula/site/hero',
    'Cloudinary signature payload is incomplete.',
  );

  console.log(JSON.stringify({
    success: true,
    checks: {
      viewerCreate: 'denied',
      editorCreate: 'allowed',
      anonymousDraftRead: 'denied',
      viewerDraftRead: 'allowed',
      viewerUpdate: 'denied',
      editorDelete: 'denied',
      ownerDelete: 'allowed',
      viewerAdminFunction: 'denied',
      ownerCloudinarySignature: 'allowed',
    },
  }, null, 2));
} finally {
  await cleanup();
}
