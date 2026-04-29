import { login } from './auth.js';

function qs(params = {}) {
  const out = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') out.set(key, String(value));
  }
  const text = out.toString();
  return text ? `?${text}` : '';
}

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
    let body = options.body;
    if (body && typeof body !== 'string' && !(body instanceof Uint8Array) && !(body instanceof FormData)) {
      body = JSON.stringify(body);
    }
    if (body && !headers.has('content-type') && !(body instanceof FormData)) headers.set('content-type', 'application/json');
    const res = await fetch(url, { ...options, headers, body });
    const text = await res.text();
    let parsed;
    try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
    if (!res.ok) {
      const err = new Error(`skylight api ${res.status} for ${path}`);
      err.status = res.status;
      err.body = parsed;
      throw err;
    }
    return parsed;
  }

  get(path) { return this.api(path); }
  post(path, body) { return this.api(path, { method: 'POST', body }); }
  put(path, body) { return this.api(path, { method: 'PUT', body }); }
  patch(path, body) { return this.api(path, { method: 'PATCH', body }); }
  delete(path, body) { return this.api(path, { method: 'DELETE', body }); }

  me() { return this.get('user'); }
  exportUser() { return this.post('user/export'); }
  updateUser(body) { return this.put('user', body); }
  updateUserProfile(body) { return this.patch('user/profile', body); }
  updateUserPushPreference(preference) { return this.patch('user/push_toggler', { notification_preference: preference }); }
  updateUserMarketingPreference(agreeToMarketing) { return this.patch('user/klaviyo_toggler', { agreed_to_marketing: agreeToMarketing }); }
  deleteUser() { return this.delete('user'); }

  frame(id = this.config.frameId) { return this.get(`frames/${id}`); }
  updateFrame(body, id = this.config.frameId) { return this.put(`frames/${id}`, body); }
  renameFrame(name, id = this.config.frameId) { return this.put(`frames/${id}/rename`, { name }); }
  hideFrame(id = this.config.frameId) { return this.post(`frames/${id}/hide`); }
  activationCode(id = this.config.frameId) { return this.post(`frames/${id}/activation_code`); }
  householdConfig(id = this.config.frameId) { return this.get(`frames/${id}/household_config`); }
  updateHouseholdConfig(body, id = this.config.frameId) { return this.patch(`frames/${id}/household_config`, body); }

  users(id = this.config.frameId) { return this.get(`frames/${id}/users`); }
  addUser(email, id = this.config.frameId) { return this.post(`frames/${id}/users`, { email }); }
  approveUser(userId, id = this.config.frameId) { return this.post(`frames/${id}/users/${userId}/approve`); }
  blockUser(userId, id = this.config.frameId) { return this.delete(`frames/${id}/users/${userId}`); }

  devices(id = this.config.frameId) { return this.get(`frames/${id}/devices`); }
  device(deviceId, id = this.config.frameId) { return this.get(`frames/${id}/devices/${deviceId}`); }
  updateDevice(deviceId, body, id = this.config.frameId) { return this.put(`frames/${id}/devices/${deviceId}`, body); }
  resetDevice(deviceId, id = this.config.frameId) { return this.post(`frames/${id}/devices/${deviceId}/reset`); }
  deleteDevice(deviceId, id = this.config.frameId) { return this.delete(`frames/${id}/devices/${deviceId}`); }
  deviceActivationCode(deviceId, id = this.config.frameId) { return this.post(`frames/${id}/devices/${deviceId}/activation_code`); }
  alarms(deviceId, id = this.config.frameId) { return this.get(`frames/${id}/devices/${deviceId}/alarms`); }
  createAlarm(deviceId, body, id = this.config.frameId) { return this.post(`frames/${id}/devices/${deviceId}/alarms`, body); }
  updateAlarm(deviceId, alarmId, body, id = this.config.frameId) { return this.patch(`frames/${id}/devices/${deviceId}/alarms/${alarmId}`, body); }
  deleteAlarm(deviceId, alarmId, id = this.config.frameId) { return this.delete(`frames/${id}/devices/${deviceId}/alarms/${alarmId}`); }

  categories(id = this.config.frameId) { return this.get(`frames/${id}/categories`); }
  category(categoryId, id = this.config.frameId) { return this.get(`frames/${id}/categories/${categoryId}`); }
  createCategory(body, id = this.config.frameId) { return this.post(`frames/${id}/categories`, body); }
  findOrCreateCategory(body, id = this.config.frameId) { return this.post(`frames/${id}/categories/find_or_create`, body); }
  updateCategory(categoryId, body, id = this.config.frameId) { return this.put(`frames/${id}/categories/${categoryId}`, body); }
  deleteCategory(categoryId, id = this.config.frameId) { return this.delete(`frames/${id}/categories/${categoryId}`); }
  updateCategoryFamilyMember(categoryId, body, id = this.config.frameId) { return this.put(`frames/${id}/categories/${categoryId}/family_member`, body); }

  calendarAccounts(id = this.config.frameId) { return this.get(`frames/${id}/calendars`); }
  calendarAccount(accountId, id = this.config.frameId) { return this.get(`frames/${id}/calendars/${accountId}`); }
  updateCalendarAccount(accountId, body, id = this.config.frameId) { return this.put(`frames/${id}/calendars/${accountId}`, body); }
  recentInvitedEmails(id = this.config.frameId) { return this.get(`frames/${id}/calendar_events/recent_invited_emails`); }
  calendarEvents({ id = this.config.frameId, from, to, ...rest } = {}) { return this.get(`frames/${id}/calendar_events${qs({ from, to, ...rest })}`); }
  createCalendarEvent(body, id = this.config.frameId) { return this.post(`frames/${id}/calendar_events`, body); }
  updateCalendarEvent(eventId, body, id = this.config.frameId) { return this.put(`frames/${id}/calendar_events/${eventId}`, body); }
  deleteCalendarEvent(eventId, id = this.config.frameId) { return this.delete(`frames/${id}/calendar_events/${eventId}`); }
  eventNotificationSettings(id = this.config.frameId) { return this.get(`frames/${id}/event_notification_settings`); }
  updateEventNotificationSettings(body, id = this.config.frameId) { return this.put(`frames/${id}/event_notification_settings`, body); }

  sourceCalendars(id = this.config.frameId) { return this.get(`frames/${id}/source_calendars`); }
  sourceCalendar(calendarId, id = this.config.frameId) { return this.get(`frames/${id}/source_calendars/${calendarId}`); }
  createSourceCalendar(body, id = this.config.frameId) { return this.post(`frames/${id}/source_calendars`, body); }
  updateSourceCalendar(calendarId, body, id = this.config.frameId) { return this.put(`frames/${id}/source_calendars/${calendarId}`, body); }
  deleteSourceCalendar(calendarId, id = this.config.frameId) { return this.delete(`frames/${id}/source_calendars/${calendarId}`); }
  setDefaultSourceCalendar(calendarId, id = this.config.frameId) { return this.post(`frames/${id}/source_calendars/set_default_for_new_events`, { id: calendarId }); }
  webcalAccounts(id = this.config.frameId) { return this.get(`frames/${id}/webcal_accounts`); }
  createWebcalAccount(body, id = this.config.frameId) { return this.post(`frames/${id}/webcal_accounts`, body); }

  lists(id = this.config.frameId) { return this.get(`frames/${id}/lists`); }
  list(listId, id = this.config.frameId) { return this.get(`frames/${id}/lists/${listId}`); }
  createList(body, id = this.config.frameId) { return this.post(`frames/${id}/lists`, body); }
  updateList(listId, body, id = this.config.frameId) { return this.put(`frames/${id}/lists/${listId}`, body); }
  deleteList(listId, id = this.config.frameId) { return this.delete(`frames/${id}/lists/${listId}`); }
  listItems(listId, id = this.config.frameId) { return this.get(`frames/${id}/lists/${listId}/list_items`); }
  createListItem(listId, body, id = this.config.frameId) { return this.post(`frames/${id}/lists/${listId}/list_items`, body); }
  updateListItem(listId, itemId, body, id = this.config.frameId) { return this.put(`frames/${id}/lists/${listId}/list_items/${itemId}`, body); }
  deleteListItem(listId, itemId, id = this.config.frameId) { return this.delete(`frames/${id}/lists/${listId}/list_items/${itemId}`); }
  moveListItem(listId, itemId, afterItemId = null, id = this.config.frameId) { return this.post(`frames/${id}/lists/${listId}/list_items/${itemId}/move`, { after_item_id: afterItemId ? Number(afterItemId) : null }); }
  bulkUpdateListItemSection(listId, itemIds, section = null, id = this.config.frameId) { return this.put(`frames/${id}/lists/${listId}/list_items/bulk_update_section`, { item_ids: itemIds, section: section?.trim?.() || null }); }
  bulkDeleteListItems(listId, itemIds, id = this.config.frameId) { return this.delete(`frames/${id}/lists/${listId}/list_items/bulk_destroy`, { ids: itemIds }); }

  chores({ id = this.config.frameId, after, before, includeLate = true } = {}) {
    return this.get(`frames/${id}/chores${qs({ after, before, include_late: includeLate ? 'true' : undefined })}`);
  }
  createChores(body, id = this.config.frameId) { return this.post(`frames/${id}/chores/create_multiple`, body); }
  updateChore(choreId, body, id = this.config.frameId) { return this.put(`frames/${id}/chores/${choreId}`, body); }
  completeChore(choreId, body = {}, id = this.config.frameId) { return this.put(`frames/${id}/chores/${choreId}/completions`, body); }
  deleteChore(choreId, id = this.config.frameId) { return this.delete(`frames/${id}/chores/${choreId}`); }

  taskBox(id = this.config.frameId) { return this.get(`frames/${id}/task_box/items`); }
  createTaskBoxItem(body, id = this.config.frameId) { return this.post(`frames/${id}/task_box/items`, body); }
  updateTaskBoxItem(itemId, body, id = this.config.frameId) { return this.patch(`frames/${id}/task_box/items/${itemId}`, body); }
  deleteTaskBoxItem(itemId, id = this.config.frameId) { return this.delete(`frames/${id}/task_box/items/${itemId}`); }

  rewards(id = this.config.frameId) { return this.get(`frames/${id}/rewards`); }
  reward(rewardId, id = this.config.frameId) { return this.get(`frames/${id}/rewards/${rewardId}`); }
  createReward(body, id = this.config.frameId) { return this.post(`frames/${id}/rewards`, body); }
  updateReward(rewardId, body, id = this.config.frameId) { return this.patch(`frames/${id}/rewards/${rewardId}`, body); }
  deleteReward(rewardId, id = this.config.frameId) { return this.delete(`frames/${id}/rewards/${rewardId}`); }
  rewardPoints(id = this.config.frameId) { return this.get(`frames/${id}/reward_points`); }
  updateRewardPoints(categoryIds, points, id = this.config.frameId) { return this.post(`frames/${id}/reward_points`, { category_ids: categoryIds, points }); }
  redeemReward(rewardId, id = this.config.frameId) { return this.post(`frames/${id}/rewards/${rewardId}/redeem`); }
  unredeemReward(rewardId, id = this.config.frameId) { return this.post(`frames/${id}/rewards/${rewardId}/unredeem`); }

  mealCategories(id = this.config.frameId) { return this.get(`frames/${id}/meals/categories`); }
  updateMealCategory(categoryId, body, id = this.config.frameId) { return this.patch(`frames/${id}/meals/categories/${categoryId}`, body); }
  meals(id = this.config.frameId) { return this.get(`frames/${id}/meals/recipes?include=meal_category`); }
  mealRecipe(recipeId, id = this.config.frameId) { return this.get(`frames/${id}/meals/recipes/${recipeId}?include=meal_category`); }
  createMealRecipe(body, id = this.config.frameId) { return this.post(`frames/${id}/meals/recipes?include=meal_category`, body); }
  updateMealRecipe(recipeId, body, id = this.config.frameId) { return this.patch(`frames/${id}/meals/recipes/${recipeId}?include=meal_category`, body); }
  addMealRecipeToGroceryList(recipeId, id = this.config.frameId) { return this.post(`frames/${id}/meals/recipes/${recipeId}/add_to_grocery_list`); }

  albums(id = this.config.frameId) { return this.get(`frames/${id}/albums`); }
  album(albumId, id = this.config.frameId) { return this.get(`frames/${id}/albums/${albumId}`); }
  createAlbum(body, id = this.config.frameId) { return this.post(`frames/${id}/albums`, body); }
  updateAlbum(albumId, body, id = this.config.frameId) { return this.put(`frames/${id}/albums/${albumId}`, body); }
  deleteAlbum(albumId, id = this.config.frameId) { return this.delete(`frames/${id}/albums/${albumId}`); }
  addToAlbum(body, id = this.config.frameId) { return this.post(`frames/${id}/albums/add_to`, body); }
  removeFromAlbum(body, id = this.config.frameId) { return this.post(`frames/${id}/albums/remove_from`, body); }
  albumMessageIds(albumId, id = this.config.frameId) { return this.get(`frames/${id}/albums/${albumId}/messages/all_ids`); }

  messages(id = this.config.frameId) { return this.get(`frames/${id}/messages`); }
  message(messageId, id = this.config.frameId) { return this.get(`frames/${id}/messages/${messageId}`); }
  deleteMessage(messageId, id = this.config.frameId) { return this.delete(`frames/${id}/messages/${messageId}`); }
  updateMessageCaption(messageId, body, id = this.config.frameId) { return this.put(`frames/${id}/messages/${messageId}/caption`, body); }
  messageLikes(messageId, id = this.config.frameId) { return this.get(`frames/${id}/messages/${messageId}/all_likes`); }
  likeMessage(messageId, id = this.config.frameId) { return this.post(`frames/${id}/messages/${messageId}/likes`); }
  unlikeMessage(messageId, id = this.config.frameId) { return this.delete(`frames/${id}/messages/${messageId}/likes`); }
  commentMessage(messageId, body, id = this.config.frameId) { return this.post(`frames/${id}/messages/${messageId}/comments`, body); }
  deleteMessageComment(messageId, commentId, id = this.config.frameId) { return this.delete(`frames/${id}/messages/${messageId}/comments/${commentId}`); }
  bulkDeleteMessages(ids, id = this.config.frameId) { return this.delete(`frames/${id}/messages/destroy_multiple`, { ids }); }

  autoCreationIntents(id = this.config.frameId) { return this.get(`frames/${id}/auto_creation_intents`); }
  autoCreationIntent(intentId, id = this.config.frameId) { return this.get(`frames/${id}/auto_creation_intents/${intentId}`); }
  createAutoCreationIntent(body, id = this.config.frameId) { return this.post(`frames/${id}/auto_creation_intents`, body); }
  retryAutoCreationIntent(intentId, id = this.config.frameId) { return this.post(`frames/${id}/auto_creation_intents/${intentId}/retry_draft`); }
  approveAutoCreationIntent(intentId, id = this.config.frameId) { return this.post(`frames/${id}/auto_creation_intents/${intentId}/approve_draft`); }
  undoAutoCreationIntent(intentId, id = this.config.frameId) { return this.post(`frames/${id}/auto_creation_intents/${intentId}/undo`); }
  autoCreatedItems(intentId, id = this.config.frameId) { return this.get(`frames/${id}/auto_creation_intents/${intentId}/created_items`); }

  monthInReview(id = this.config.frameId) { return this.get(`frames/${id}/month_in_review`); }
}
