const STAGING_PROJECT_REF = 'gimugfooncsmyztjuull';
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const existingEmail = process.env.ADMIN_EXISTING_EMAIL?.trim().toLowerCase();
const fullName = process.env.ADMIN_FULL_NAME?.trim();

if (!supabaseUrl?.includes(STAGING_PROJECT_REF)) {
  throw new Error(`Refusing to configure an administrator outside staging ${STAGING_PROJECT_REF}.`);
}

if (!serviceRoleKey || !email || !fullName) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL and ADMIN_FULL_NAME are required.');
}

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
  'content-type': 'application/json',
};

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

const usersResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=1&per_page=1000`, {
  headers,
});
const usersPayload = await readJson(usersResponse);
if (!usersResponse.ok) {
  throw new Error(`Unable to list staging Auth users (${usersResponse.status}).`);
}

let user = usersPayload?.users?.find((candidate) => candidate.email?.toLowerCase() === email);

if (!user && existingEmail) {
  user = usersPayload?.users?.find(
    (candidate) => candidate.email?.toLowerCase() === existingEmail,
  );

  if (user?.id) {
    const updateEmailResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ email, email_confirm: true }),
    });
    const updatedUser = await readJson(updateEmailResponse);
    if (!updateEmailResponse.ok) {
      throw new Error(`Unable to update the staging administrator email (${updateEmailResponse.status}).`);
    }
    user = updatedUser;
  }
}

if (!user?.id) {
  throw new Error(`Auth user ${email} was not found in staging.`);
}

if (!user.email_confirmed_at) {
  const confirmResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ email_confirm: true }),
  });
  if (!confirmResponse.ok) {
    throw new Error(`Unable to confirm the staging administrator email (${confirmResponse.status}).`);
  }
}

const profileResponse = await fetch(`${supabaseUrl}/rest/v1/admin_profiles?on_conflict=user_id`, {
  method: 'POST',
  headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({
    user_id: user.id,
    full_name: fullName,
    role: 'super_admin',
    active: true,
  }),
});
if (!profileResponse.ok) {
  throw new Error(`Unable to upsert admin_profiles (${profileResponse.status}).`);
}

const accessResponse = await fetch(`${supabaseUrl}/rest/v1/admin_app_access?on_conflict=user_id,app_code`, {
  method: 'POST',
  headers: { ...headers, prefer: 'resolution=merge-duplicates,return=minimal' },
  body: JSON.stringify({
    user_id: user.id,
    app_code: 'cms',
    access_role: 'owner',
    active: true,
  }),
});
if (!accessResponse.ok) {
  throw new Error(`Unable to upsert admin_app_access (${accessResponse.status}).`);
}

console.log(JSON.stringify({
  success: true,
  email,
  fullName,
  globalRole: 'super_admin',
  cmsRole: 'owner',
  active: true,
}, null, 2));
