import { test, expect, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const api = 'http://127.0.0.1:56321';
const password = 'ReadinessFixture9!';
const anon = process.env.READINESS_ANON_KEY!;
const service = process.env.READINESS_SERVICE_ROLE_KEY!;
if (!anon || !service)
  throw new Error('Run through readiness-preview.mjs --test with the isolated runtime file.');

async function fixtureUser(name: string) {
  const email = `readiness-${randomUUID()}@example.test`;
  const response = await fetch(`${api}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: service,
      Authorization: `Bearer ${service}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    }),
  });
  if (!response.ok) throw new Error(`Local fixture creation failed: HTTP${response.status}`);
  return { email, id: (await response.json()).id as string };
}
async function removeUser(id: string) {
  const response = await fetch(`${api}/auth/v1/admin/users/${id}`, {
    method: 'DELETE',
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  if (!response.ok) throw new Error(`Local fixture cleanup failed: HTTP${response.status}`);
}
async function userIdForEmail(email: string) {
  const response = await fetch(`${api}/auth/v1/admin/users?per_page=100`, {
    headers: { apikey: service, Authorization: `Bearer ${service}` },
  });
  expect(response.ok).toBeTruthy();
  return (await response.json()).users.find((user: { email: string }) => user.email === email)
    ?.id as string | undefined;
}
async function mailFor(email: string) {
  let message: any;
  await expect
    .poll(async () => {
      const response = await fetch('http://127.0.0.1:56324/api/v1/messages');
      if (!response.ok) throw new Error('Local mail list unavailable');
      const mailbox = await response.json();
      message = mailbox.messages.find((item: any) =>
        item.To?.some((to: any) => to.Address === email),
      );
      return Boolean(message);
    })
    .toBeTruthy();
  const response = await fetch(`http://127.0.0.1:56324/api/v1/message/${message.ID}`);
  expect(response.ok).toBeTruthy();
  return response.json();
}
function verifyLink(message: any) {
  const candidates = [...String(message.HTML).matchAll(/href="([^"]+)"/g)].map((match) =>
    match[1]!.replaceAll('&amp;', '&'),
  );
  const value = candidates.find((candidate) => candidate.includes('/auth/v1/verify'));
  if (!value || new URL(value).origin !== api)
    throw new Error('Refusing any nonlocal confirmation link');
  return value;
}
async function login(page: Page, email: string, secret = password) {
  const panel = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Sign in', exact: true }) });
  await panel.getByLabel('Email', { exact: true }).fill(email);
  await panel.getByLabel('Password', { exact: true }).fill(secret);
  await panel.getByRole('button', { name: 'Sign in', exact: true }).click();
}
test.beforeEach(async ({ page }) => {
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    if (
      url.protocol === 'data:' ||
      (['127.0.0.1', 'localhost'].includes(url.hostname) &&
        ['4182', '56321', '56324'].includes(url.port))
    )
      return route.continue();
    return route.abort('blockedbyclient');
  });
});

test('anonymous customer revisits discovery and is gated from private account/merchant pages', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Parish Pass', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Explore local businesses', exact: true }).click();
  await expect(page).toHaveURL(/\/explore$/);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  for (const destination of ['/account', '/account/businesses/new', '/admin']) {
    await page.goto(destination);
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
  }
});

test('failed login recovers, profile persists, sign-out/back/reload do not restore a session', async ({
  page,
}) => {
  const user = await fixtureUser('Workflow Customer');
  try {
    await page.goto('/auth');
    await login(page, user.email, 'WrongPassword9!');
    await expect(page.getByText('The email or password was not recognized.')).toBeVisible();
    await login(page, user.email);
    await expect(page.getByRole('heading', { name: 'Hi, Workflow Customer.' })).toBeVisible();
    await page.getByLabel('Display name', { exact: true }).fill('Updated Workflow Customer');
    await page.getByRole('button', { name: /Save profile/i }).click();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Hi, Updated Workflow Customer.' }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4182/');
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await page.goBack();
    await page.reload();
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  } finally {
    await removeUser(user.id);
  }
});

test('account A / sign-out / account B shows B and denies administrator access', async ({
  page,
}) => {
  const first = await fixtureUser('Account Alpha');
  const second = await fixtureUser('Account Beta');
  try {
    await page.goto('/auth');
    await login(page, first.email);
    await expect(page.getByRole('heading', { name: 'Hi, Account Alpha.' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4182/');
    await page.goto('/auth');
    await login(page, second.email);
    await expect(page.getByRole('heading', { name: 'Hi, Account Beta.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hi, Account Beta.' })).toBeVisible();
    const denied = await page.goto('/admin');
    expect(denied?.status()).toBe(404);
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
    await page.goto('/account');
    await expect(page.getByRole('link', { name: 'Admin console', exact: true })).toHaveCount(0);
  } finally {
    await removeUser(first.id);
    await removeUser(second.id);
  }
});

test('unconfirmed signup delivers only to local mail and cannot log in before verification', async ({
  page,
}) => {
  const email = `signup-${randomUUID()}@example.test`;
  let id: string | undefined;
  try {
    await page.goto('/auth');
    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Create an account', exact: true }) });
    await panel.getByLabel('Display name', { exact: true }).fill('Signup Workflow');
    await panel.getByLabel('Email', { exact: true }).fill(email);
    await panel.getByLabel(/^Password/).fill(password);
    await panel.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(panel.getByText(/Check your email/i)).toBeVisible();
    await login(page, email);
    await expect(page.getByText('The email or password was not recognized.')).toBeVisible();
    const users = await fetch(`${api}/auth/v1/admin/users?per_page=100`, {
      headers: { apikey: service, Authorization: `Bearer ${service}` },
    });
    expect(users.ok).toBeTruthy();
    id = (await users.json()).users.find((user: { email: string }) => user.email === email)?.id;
    expect(id).toBeTruthy();
    const messages = await fetch('http://127.0.0.1:56324/api/v1/messages');
    expect(messages.ok).toBeTruthy();
    const mailbox = await messages.json();
    expect(JSON.stringify(mailbox.messages)).toContain(email);
  } finally {
    if (id) await removeUser(id);
  }
});

test('unsafe next remains on the app after real login and repeated expired callbacks recover', async ({
  page,
}) => {
  const user = await fixtureUser('Redirect Workflow');
  try {
    await page.goto('/auth?next=' + encodeURIComponent('/\\outside.example'));
    await login(page, user.email);
    await expect(page).toHaveURL('http://127.0.0.1:4182/account');
    // Revisiting auth while already signed in must use the same redirect guard.
    await page.goto('/auth?next=' + encodeURIComponent('/\\outside.example'));
    await expect(page).toHaveURL('http://127.0.0.1:4182/account');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4182/');
    for (let retry = 0; retry < 2; retry++) {
      await page.goto(
        '/auth/callback?code=expired-local-fixture&next=' +
          encodeURIComponent('/\\outside.example'),
      );
      await expect(page).toHaveURL(/\/auth\?error=confirmation$/);
      expect(['127.0.0.1', 'localhost']).toContain(new URL(page.url()).hostname);
      await expect(page.getByRole('heading', { name: 'Sign in', exact: true })).toBeVisible();
    }
  } finally {
    await removeUser(user.id);
  }
});

test('signup consumes the actual local confirmation mail and a repeated link cannot restore a signed-out session', async ({
  page,
}) => {
  const email = `confirm-${randomUUID()}@example.test`;
  let id: string | undefined;
  try {
    await page.goto('/auth');
    const panel = page
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Create an account', exact: true }) });
    await panel.getByLabel('Display name', { exact: true }).fill('Verified Workflow');
    await panel.getByLabel('Email', { exact: true }).fill(email);
    await panel.getByLabel(/^Password/).fill(password);
    await panel.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(panel.getByText(/Check your email/i)).toBeVisible();
    id = await userIdForEmail(email);
    expect(id).toBeTruthy();
    const link = verifyLink(await mailFor(email));
    await page.goto(link);
    await expect(page).toHaveURL('http://127.0.0.1:4182/account');
    await expect(page.getByRole('heading', { name: 'Hi, Verified Workflow.' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Hi, Verified Workflow.' })).toBeVisible();
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4182/');
    await page.goto(link);
    await page.goto('/account');
    await expect(page).toHaveURL(/\/auth(?:\?|$)/);
    await login(page, email);
    await expect(page.getByRole('heading', { name: 'Hi, Verified Workflow.' })).toBeVisible();
  } finally {
    id ??= await userIdForEmail(email);
    if (id) await removeUser(id);
  }
});

test('local password recovery consumes mail once, changes the password, and permits a new browser login', async ({
  page,
}) => {
  const user = await fixtureUser('Password Recovery Workflow');
  const updatedPassword = 'ChangedReadinessFixture7!';
  const headers = {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    'Content-Type': 'application/json',
  };
  try {
    // The web UI has no password-reset form. Exercise real local GoTrue recovery
    // and password update, then the real app login; native recovery UI is unverified.
    const started = await fetch(`${api}/auth/v1/recover`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email: user.email }),
    });
    expect(started.ok).toBeTruthy();
    const message = await mailFor(user.email);
    const token = String(message.Text).match(/\b\d{6}\b/)?.[0];
    expect(Boolean(token)).toBeTruthy();
    const verification = { type: 'recovery', email: user.email, token };
    const verified = await fetch(`${api}/auth/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(verification),
    });
    expect(verified.ok).toBeTruthy();
    const session = await verified.json();
    const changed = await fetch(`${api}/auth/v1/user`, {
      method: 'PUT',
      headers: { ...headers, Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ password: updatedPassword }),
    });
    expect(changed.ok).toBeTruthy();
    const repeated = await fetch(`${api}/auth/v1/verify`, {
      method: 'POST',
      headers,
      body: JSON.stringify(verification),
    });
    expect(repeated.ok).toBeFalsy();
    await page.goto('/auth');
    await login(page, user.email, password);
    await expect(page.getByText('The email or password was not recognized.')).toBeVisible();
    await login(page, user.email, updatedPassword);
    await expect(
      page.getByRole('heading', { name: 'Hi, Password Recovery Workflow.' }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Hi, Password Recovery Workflow.' }),
    ).toBeVisible();
  } finally {
    await removeUser(user.id);
  }
});

test('merchant creates a private draft and another customer cannot see its membership', async ({
  page,
}) => {
  const owner = await fixtureUser('Draft Merchant');
  const other = await fixtureUser('Unrelated Customer');
  const headers = {
    apikey: service,
    Authorization: `Bearer ${service}`,
    'Content-Type': 'application/json',
  };
  const before = await fetch(
    `${api}/rest/v1/platform_settings?key=eq.business_listing_billing&select=value`,
    { headers },
  );
  expect(before.ok).toBeTruthy();
  const prior = (await before.json())[0].value;
  let businessId: string | undefined;
  const name = `Workflow Draft ${randomUUID().slice(0, 8)}`;
  try {
    // Billing is disabled only in this disposable local fixture; no provider purchase is represented.
    const flag = await fetch(`${api}/rest/v1/platform_settings?key=eq.business_listing_billing`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ value: { enabled: false } }),
    });
    expect(flag.ok).toBeTruthy();
    await page.goto('/auth');
    await login(page, owner.email);
    await expect(page.getByRole('heading', { name: 'Hi, Draft Merchant.' })).toBeVisible();
    await page.getByRole('link', { name: 'Add business', exact: true }).click();
    await page.getByLabel('Business name', { exact: true }).fill(name);
    await page
      .getByLabel('Description', { exact: true })
      .fill('A synthetic local merchant draft for automated workflow validation.');
    await page.getByLabel('City', { exact: true }).fill('Baton Rouge');
    await test.step('select the business location state', async () => {
      await page.locator('select[name="regionCode"]').selectOption('LA');
    });
    await test.step('choose a business category', async () => {
      await page.getByRole('checkbox', { name: 'Other Local Business', exact: true }).check();
    });
    await page.getByRole('button', { name: 'Create business profile', exact: true }).click();
    await expect(page).toHaveURL(/\/account\?created=1$/);
    await expect(page.getByText(name, { exact: true })).toBeVisible();
    const query = await fetch(
      `${api}/rest/v1/businesses?created_by=eq.${owner.id}&select=id,slug,status`,
      { headers },
    );
    expect(query.ok).toBeTruthy();
    const businesses = await query.json();
    expect(businesses).toHaveLength(1);
    expect(businesses[0].status).toBe('draft');
    businessId = businesses[0].id;
    // Owners may preview their own unpublished page through the existing RLS contract.
    await page.goto(`/b/${businesses[0].slug}`);
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.goto('/account');
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await expect(page).toHaveURL('http://127.0.0.1:4182/');
    await page.goto(`/b/${businesses[0].slug}`);
    await expect(page.getByRole('heading', { name: '404', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name, exact: true })).toHaveCount(0);
    await page.goto('/auth');
    await login(page, other.email);
    await expect(page.getByRole('heading', { name: 'Hi, Unrelated Customer.' })).toBeVisible();
    await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  } finally {
    // Discover the fixture even if an assertion failed after server creation.
    if (!businessId) {
      const query = await fetch(`${api}/rest/v1/businesses?created_by=eq.${owner.id}&select=id`, {
        headers,
      });
      if (query.ok) businessId = (await query.json())[0]?.id;
    }
    if (businessId) {
      const removed = await fetch(`${api}/rest/v1/businesses?id=eq.${businessId}`, {
        method: 'DELETE',
        headers,
      });
      expect(removed.ok).toBeTruthy();
    }
    const restored = await fetch(
      `${api}/rest/v1/platform_settings?key=eq.business_listing_billing`,
      { method: 'PATCH', headers, body: JSON.stringify({ value: prior }) },
    );
    expect(restored.ok).toBeTruthy();
    await removeUser(owner.id);
    await removeUser(other.id);
  }
});
