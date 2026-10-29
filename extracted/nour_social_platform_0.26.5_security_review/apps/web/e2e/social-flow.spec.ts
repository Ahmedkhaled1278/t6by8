import { expect, test } from '@playwright/test';

const unique = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const email = `e2e_${unique}@example.test`;
const username = `e2e_${unique.replace(/[^a-z0-9_]/gi, '').toLowerCase()}`.slice(0, 30);
const password = 'TestPassword_2026!';
const displayName = `مستخدم اختبار ${unique.slice(-6)}`;
const postBody = `منشور اختبار آلي ${unique}`;
const commentBody = `تعليق اختبار آلي ${unique}`;

test('visitor can register, publish, comment, react, log out and log in', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', error => consoleErrors.push(error.message));

  await page.goto('/account');
  await expect(page.locator('#page_account')).toBeVisible();
  await page.locator('#btn_account_mode_register').click();
  await page.locator('#field_account_display_name').fill(displayName);
  await page.locator('#field_account_username').fill(username);
  await page.locator('#field_account_email').fill(email);
  await page.locator('#field_account_password').fill(password);
  await page.locator('#btn_account_submit').click();
  await expect(page.getByRole('heading', { name: `أهلًا بيك، ${displayName}` })).toBeVisible();
  await expect(page.locator('#btn_account_logout')).toBeVisible();

  await page.goto('/feed');
  await expect(page.locator('#page_feed')).toBeVisible();
  await page.locator('#field_post_body').fill(postBody);
  await page.locator('#btn_post_create_submit').click();
  const postCard = page.locator('[data-entity-id]').filter({ has: page.locator('.feed-post-body', { hasText: postBody }) });
  await expect(postCard).toHaveCount(1);
  const postId = await postCard.getAttribute('data-entity-id');
  expect(postId).toBeTruthy();
  const post = page.locator(`#post_${postId}`);
  await expect(post).toHaveCount(1);

  await post.locator(`#field_comment_body_${postId}`).fill(commentBody);
  await post.locator(`#btn_comment_submit_${postId}`).click();
  await expect(post.getByText(commentBody)).toBeVisible();

  await post.locator(`#btn_post_reaction_${postId}`).click();
  await expect(post.locator(`#btn_post_reaction_${postId}`)).toContainText('إعجاب (1)');

  await page.locator('#link_feed_nav_account').click();
  await expect(page.locator('#btn_account_logout')).toBeVisible();
  await page.locator('#btn_account_logout').click();
  await expect(page.locator('#btn_account_mode_login')).toBeVisible();

  await page.locator('#field_account_email').fill(email);
  await page.locator('#field_account_password').fill(password);
  await page.locator('#btn_account_submit').click();
  await expect(page.getByRole('heading', { name: `أهلًا بيك، ${displayName}` })).toBeVisible();
  expect(consoleErrors, `Browser page errors: ${consoleErrors.join(' | ')}`).toEqual([]);
});

test('interactive source IDs are unique in rendered pages', async ({ page }) => {
  for (const route of ['/', '/feed', '/account', '/offline']) {
    await page.goto(route);
    const result = await page.locator('[id]').evaluateAll(elements => {
      const ids = elements.map(element => element.id).filter(Boolean);
      const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
      const interactiveWithoutId = Array.from(document.querySelectorAll('a,button,input,textarea,select,form'))
        .filter(element => !element.id)
        .map(element => `${element.tagName.toLowerCase()}:${element.textContent?.trim().slice(0, 40) ?? ''}`);
      return { duplicates: [...new Set(duplicates)], interactiveWithoutId };
    });
    expect(result.duplicates, `Duplicate DOM IDs on ${route}`).toEqual([]);
    expect(result.interactiveWithoutId, `Interactive elements without IDs on ${route}`).toEqual([]);
  }
});
