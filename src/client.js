import { login } from './auth.js';

export class SkylightClient {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://app.ourskylight.com';
    this.token = config.token;
  }

  async ensureToken() {
    if (!this.token) {
      const t = await login(this.config);
      this.token = t.access_token;
      this.tokenResponse = t;
    }
    return this.token;
  }

  async api(path, options = {}) {
    const token = await this.ensureToken();
    const url = new URL(path.replace(/^\/+/, ''), `${this.baseUrl.replace(/\/$/, '')}/api/`);
    const headers = new Headers(options.headers || {});
    headers.set('accept', 'application/json');
    headers.set('authorization', `Bearer ${token}`);
    if (options.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
    const res = await fetch(url, { ...options, headers });
    const text = await res.text();
    let body;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!res.ok) {
      const err = new Error(`skylight api ${res.status} for ${path}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  me() { return this.api('user'); }
  frame(id = this.config.frameId) { return this.api(`frames/${id}`); }
  users(id = this.config.frameId) { return this.api(`frames/${id}/users`); }
  devices(id = this.config.frameId) { return this.api(`frames/${id}/devices`); }
  categories(id = this.config.frameId) { return this.api(`frames/${id}/categories`); }
  lists(id = this.config.frameId) { return this.api(`frames/${id}/lists`); }
  list(id, listId) { return this.api(`frames/${id || this.config.frameId}/lists/${listId}`); }
  listItems(listId, id = this.config.frameId) { return this.api(`frames/${id}/lists/${listId}/list_items`); }
  chores({ id = this.config.frameId, after, before, includeLate = true } = {}) {
    const qs = new URLSearchParams();
    if (after) qs.set('after', after);
    if (before) qs.set('before', before);
    if (includeLate) qs.set('include_late', 'true');
    return this.api(`frames/${id}/chores?${qs}`);
  }
  taskBox(id = this.config.frameId) { return this.api(`frames/${id}/task_box/items`); }
  rewards(id = this.config.frameId) { return this.api(`frames/${id}/rewards`); }
  meals(id = this.config.frameId) { return this.api(`frames/${id}/meals/recipes?include=meal_category`); }
  mealCategories(id = this.config.frameId) { return this.api(`frames/${id}/meals/categories`); }
  sourceCalendars(id = this.config.frameId) { return this.api(`frames/${id}/source_calendars`); }
  webcalAccounts(id = this.config.frameId) { return this.api(`frames/${id}/webcal_accounts`); }
  calendarAccounts(id = this.config.frameId) { return this.api(`frames/${id}/calendars`); }
  recentInvitedEmails(id = this.config.frameId) { return this.api(`frames/${id}/calendar_events/recent_invited_emails`); }
  householdConfig(id = this.config.frameId) { return this.api(`frames/${id}/household_config`); }
  albums(id = this.config.frameId) { return this.api(`frames/${id}/albums`); }
  messages(id = this.config.frameId) { return this.api(`frames/${id}/messages`); }
  autoCreationIntents(id = this.config.frameId) { return this.api(`frames/${id}/auto_creation_intents`); }
  eventNotificationSettings(id = this.config.frameId) { return this.api(`frames/${id}/event_notification_settings`); }
}
