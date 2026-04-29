export async function readonlySmoke(client) {
  const today = new Date().toISOString().slice(0, 10);
  const checks = [
    ['me', () => client.me()],
    ['frame', () => client.frame()],
    ['users', () => client.users()],
    ['devices', () => client.devices()],
    ['household_config', () => client.householdConfig()],
    ['categories', () => client.categories()],
    ['source_calendars', () => client.sourceCalendars()],
    ['webcal_accounts', () => client.webcalAccounts()],
    ['calendar_accounts', () => client.calendarAccounts()],
    ['recent_invited_emails', () => client.recentInvitedEmails()],
    ['lists', () => client.lists()],
    ['chores_today', () => client.chores({ after: today, before: today })],
    ['task_box', () => client.taskBox()],
    ['rewards', () => client.rewards()],
    ['meal_categories', () => client.mealCategories()],
    ['meal_recipes', () => client.meals()],
    ['albums', () => client.albums()],
    ['messages', () => client.messages()],
    ['auto_creation_intents', () => client.autoCreationIntents()],
    ['event_notification_settings', () => client.eventNotificationSettings()],
  ];
  const results = [];
  for (const [name, fn] of checks) {
    try {
      const body = await fn();
      const data = body?.data;
      results.push({ name, ok: true, dataType: Array.isArray(data) ? 'array' : typeof data, count: Array.isArray(data) ? data.length : undefined, included: Array.isArray(body?.included) ? body.included.length : undefined });
    } catch (e) {
      results.push({ name, ok: false, error: e.message, status: e.status, body: e.body });
    }
  }
  return results;
}
