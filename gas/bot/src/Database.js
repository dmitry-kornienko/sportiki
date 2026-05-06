// ============================================================
// файл: Database.js
// Назначение: Слой доступа к данным Google Sheets.
//
// Архитектура:
//   COLUMNS / COL    — индексы столбцов (единственное место)
//   SheetCache       — кэш листов и данных на время одного запроса
//   UserRepository   — работа с листом Users
//   StateRepository  — работа с листом States
//   EventRepository  — работа с листом Events
//   RegRepository    — работа с листом Registrations
//   db               — фасад, единая точка входа для остального кода
// ============================================================

const COLUMNS = Object.freeze({
  USERS: {
    CHAT_ID:       1,
    USERNAME:      2,
    FIRST_NAME:    3,
    CREATED_AT:    4,
    LAST_SEEN:     5
  },
  STATES: {
    CHAT_ID:       1,
    STATE:         2,
    TEMP_DATA:     3
  },
  EVENTS: {
    ID:            1,
    TYPE:          2,
    TITLE:         3,
    DATE:          4,
    TIME:          5,
    MAX_PEOPLE:    6,
    INFO:          7,
    STATUS:        8,
    LOCATION:      9,
    REMINDER_SENT: 10
  },
  REGS: {
    CHAT_ID:       1,
    EVENT_ID:      2,
    NAME:          3,
    REG_DATE:      4,
    STATUS:        5,
    USERNAME:      6,
    TG_NAME:       7,
    IS_GUEST:      8,
    CONFIRMATION:  9
  }
});

const COL = Object.freeze({
  USERS: {
    CHAT_ID:       0,
    USERNAME:      1,
    FIRST_NAME:    2,
    CREATED_AT:    3,
    LAST_SEEN:     4
  },
  STATES: {
    CHAT_ID:       0,
    STATE:         1,
    TEMP_DATA:     2
  },
  EVENTS: {
    ID:            0,
    TYPE:          1,
    TITLE:         2,
    DATE:          3,
    TIME:          4,
    MAX_PEOPLE:    5,
    INFO:          6,
    STATUS:        7,
    LOCATION:      8,
    REMINDER_SENT: 9
  },
  REGS: {
    CHAT_ID:       0,
    EVENT_ID:      1,
    NAME:          2,
    REG_DATE:      3,
    STATUS:        4,
    USERNAME:      5,
    TG_NAME:       6,
    IS_GUEST:      7,
    CONFIRMATION:  8
  }
});

const SheetCache = {
  _sheets: {},
  _data: {},

  sheet(name) {
    if (!this._sheets[name]) {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      this._sheets[name] = ss.getSheetByName(name) || ss.insertSheet(name);
    }
    return this._sheets[name];
  },

  data(name) {
    if (!this._data[name]) {
      this._data[name] = this.sheet(name).getDataRange().getValues();
    }
    return this._data[name];
  },

  invalidate(name) {
    delete this._data[name];
  },

  clear() {
    this._sheets = {};
    this._data = {};
  }
};

const UserRepository = {

  register(chatId, from) {
    const data = SheetCache.data(SHEET_NAMES.USERS);
    const id   = chatId.toString();

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.USERS.CHAT_ID].toString() === id) return;
    }

    const sheet     = SheetCache.sheet(SHEET_NAMES.USERS);
    const now       = new Date();
    const username  = from.username ? '@' + from.username : 'no_username';
    const firstName = from.first_name || 'Incognito';
    sheet.appendRow([chatId, username, firstName, now, now]);
    SheetCache.invalidate(SHEET_NAMES.USERS);
  },

  find(chatId) {
    const data = SheetCache.data(SHEET_NAMES.USERS);
    const id   = chatId.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.USERS.CHAT_ID].toString() === id) {
        return {
          username:  data[i][COL.USERS.USERNAME]  || 'no_username',
          firstName: data[i][COL.USERS.FIRST_NAME] || 'Incognito'
        };
      }
    }
    return null;
  },

  // Возвращает все chatId из листа Users
  getAllChatIds() {
    const data = SheetCache.data(SHEET_NAMES.USERS);
    const ids  = [];
    for (let i = 1; i < data.length; i++) {
      const id = data[i][COL.USERS.CHAT_ID];
      if (id) ids.push(id.toString());
    }
    return ids;
  }
};

const StateRepository = {

  get(chatId) {
    const data = SheetCache.data(SHEET_NAMES.STATES);
    const id   = chatId.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.STATES.CHAT_ID].toString() === id) {
        return {
          state:    data[i][COL.STATES.STATE]     || STATUSES.MAIN_MENU,
          tempData: data[i][COL.STATES.TEMP_DATA]
            ? data[i][COL.STATES.TEMP_DATA].toString() : ''
        };
      }
    }
    return { state: STATUSES.MAIN_MENU, tempData: '' };
  },

  set(chatId, state, tempData = '') {
    const sheet = SheetCache.sheet(SHEET_NAMES.STATES);
    const data  = SheetCache.data(SHEET_NAMES.STATES);
    const id    = chatId.toString();

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.STATES.CHAT_ID].toString() === id) {
        sheet.getRange(i + 1, COLUMNS.STATES.STATE, 1, 2)
             .setValues([[state, tempData]]);
        SheetCache.invalidate(SHEET_NAMES.STATES);
        return;
      }
    }

    sheet.appendRow([chatId, state, tempData]);
    SheetCache.invalidate(SHEET_NAMES.STATES);
  },

  reset(chatId) {
    this.set(chatId, STATUSES.MAIN_MENU, '');
  }
};

const EventRepository = {

  _rowToEvent(row) {
    return {
      id:           row[COL.EVENTS.ID].toString(),
      type:         row[COL.EVENTS.TYPE]          ? row[COL.EVENTS.TYPE].toString()          : '',
      title:        row[COL.EVENTS.TITLE]         ? row[COL.EVENTS.TITLE].toString()         : '',
      date:         this._formatDate(row[COL.EVENTS.DATE]),
      time:         this._formatTime(row[COL.EVENTS.TIME]),
      maxPeople:    row[COL.EVENTS.MAX_PEOPLE] !== '' ? row[COL.EVENTS.MAX_PEOPLE].toString() : '0',
      info:         row[COL.EVENTS.INFO]          ? row[COL.EVENTS.INFO].toString()          : '',
      status:       row[COL.EVENTS.STATUS]        ? row[COL.EVENTS.STATUS].toString().trim() : '',
      location:     row[COL.EVENTS.LOCATION]      ? row[COL.EVENTS.LOCATION].toString()      : '',
      reminderSent: row[COL.EVENTS.REMINDER_SENT] ? row[COL.EVENTS.REMINDER_SENT].toString() : ''
    };
  },

  _formatDate(value) {
    if (!value) return '';
    if (value instanceof Date) {
      const d = String(value.getDate()).padStart(2, '0');
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const y = value.getFullYear();
      return `${d}.${m}.${y}`;
    }
    return value.toString();
  },

  _formatTime(value) {
    if (!value) return '';
    if (value instanceof Date) {
      const h   = String(value.getHours()).padStart(2, '0');
      const min = String(value.getMinutes()).padStart(2, '0');
      return `${h}:${min}`;
    }
    return value.toString();
  },

  getActive() {
    const data = SheetCache.data(SHEET_NAMES.EVENTS);
    return data.slice(1)
      .filter(row => {
        if (!row[COL.EVENTS.ID]) return false;
        const status = row[COL.EVENTS.STATUS] ? row[COL.EVENTS.STATUS].toString().trim() : '';
        return status === STATUSES.OPEN || status === STATUSES.CLOSED;
      })
      .map(row => this._rowToEvent(row))
      .sort((a, b) => this._parseDate(a.date) - this._parseDate(b.date));
  },

  findById(id) {
    const data   = SheetCache.data(SHEET_NAMES.EVENTS);
    const target = id.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.EVENTS.ID].toString() === target) {
        return this._rowToEvent(data[i]);
      }
    }
    return null;
  },

  updateStatus(eventId, newStatus) {
    const sheet  = SheetCache.sheet(SHEET_NAMES.EVENTS);
    const data   = SheetCache.data(SHEET_NAMES.EVENTS);
    const target = eventId.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.EVENTS.ID].toString() === target) {
        sheet.getRange(i + 1, COLUMNS.EVENTS.STATUS).setValue(newStatus);
        SheetCache.invalidate(SHEET_NAMES.EVENTS);
        return true;
      }
    }
    return false;
  },

  archive(eventId) {
    return this.updateStatus(eventId, STATUSES.ARCHIVED);
  },

  updateMax(eventId, newMax) {
    const sheet  = SheetCache.sheet(SHEET_NAMES.EVENTS);
    const data   = SheetCache.data(SHEET_NAMES.EVENTS);
    const target = eventId.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.EVENTS.ID].toString() === target) {
        sheet.getRange(i + 1, COLUMNS.EVENTS.MAX_PEOPLE).setValue(newMax);
        SheetCache.invalidate(SHEET_NAMES.EVENTS);
        return true;
      }
    }
    return false;
  },

  // Обновляет одно поле события по имени.
  // fieldName: 'type'|'title'|'date'|'time'|'info'|'location'
  updateField(eventId, fieldName, value) {
    const fieldToColumn = {
      type:     COLUMNS.EVENTS.TYPE,
      title:    COLUMNS.EVENTS.TITLE,
      date:     COLUMNS.EVENTS.DATE,
      time:     COLUMNS.EVENTS.TIME,
      info:     COLUMNS.EVENTS.INFO,
      location: COLUMNS.EVENTS.LOCATION
    };
    const col = fieldToColumn[fieldName];
    if (!col) return false;

    const sheet  = SheetCache.sheet(SHEET_NAMES.EVENTS);
    const data   = SheetCache.data(SHEET_NAMES.EVENTS);
    const target = eventId.toString();

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.EVENTS.ID].toString() === target) {
        sheet.getRange(i + 1, col).setValue(value);
        SheetCache.invalidate(SHEET_NAMES.EVENTS);
        return true;
      }
    }
    return false;
  },

  markReminderSent(eventId) {
    const sheet  = SheetCache.sheet(SHEET_NAMES.EVENTS);
    const data   = SheetCache.data(SHEET_NAMES.EVENTS);
    const target = eventId.toString();
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.EVENTS.ID].toString() === target) {
        sheet.getRange(i + 1, COLUMNS.EVENTS.REMINDER_SENT).setValue('YES');
        SheetCache.invalidate(SHEET_NAMES.EVENTS);
        return;
      }
    }
  },

  create(eventData) {
    const sheet = SheetCache.sheet(SHEET_NAMES.EVENTS);
    const id    = Date.now().toString().slice(-6);
    sheet.appendRow([
      id,
      eventData.type,
      eventData.title,
      eventData.date,
      eventData.time,
      eventData.maxPeople,
      eventData.info,
      STATUSES.OPEN,
      eventData.location
    ]);
    SheetCache.invalidate(SHEET_NAMES.EVENTS);
    return id;
  },

  _parseDate(dateStr) {
    try {
      const [d, m, y] = dateStr.split('.');
      return new Date(y, m - 1, d).getTime();
    } catch (e) {
      return 0;
    }
  }
};

const RegRepository = {

  _rowToReg(row) {
    return {
      chatId:       row[COL.REGS.CHAT_ID].toString(),
      eventId:      row[COL.REGS.EVENT_ID].toString(),
      name:         row[COL.REGS.NAME]         ? row[COL.REGS.NAME].toString().trim()                    : 'Без имени',
      date:         row[COL.REGS.REG_DATE],
      status:       row[COL.REGS.STATUS]       ? row[COL.REGS.STATUS].toString().trim().toUpperCase()    : '',
      username:     row[COL.REGS.USERNAME]     ? row[COL.REGS.USERNAME].toString().trim()                : 'no_link',
      tgName:       row[COL.REGS.TG_NAME]      ? row[COL.REGS.TG_NAME].toString().trim()                : '',
      isGuest:      row[COL.REGS.IS_GUEST]     ? row[COL.REGS.IS_GUEST].toString().toUpperCase() === 'YES' : false,
      confirmation: row[COL.REGS.CONFIRMATION] ? row[COL.REGS.CONFIRMATION].toString().trim()            : ''
    };
  },

  getByEvent(eventId) {
    const data   = SheetCache.data(SHEET_NAMES.REGS);
    const target = eventId.toString();
    return data.slice(1)
      .filter(row => row[COL.REGS.EVENT_ID] && row[COL.REGS.EVENT_ID].toString().trim() === target)
      .map(row => this._rowToReg(row));
  },

  getByUser(chatId) {
    const data   = SheetCache.data(SHEET_NAMES.REGS);
    const target = chatId.toString().trim();
    const result = [];

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.REGS.CHAT_ID].toString().trim() !== target) continue;
      const event = EventRepository.findById(data[i][COL.REGS.EVENT_ID]);
      if (!event || event.status === STATUSES.ARCHIVED) continue;
      result.push({
        eventId:    data[i][COL.REGS.EVENT_ID].toString(),
        eventTitle: event.title,
        eventDate:  event.date,
        eventTime:  event.time,
        nameInReg:  data[i][COL.REGS.NAME],
        status:     data[i][COL.REGS.STATUS],
        isGuest:    data[i][COL.REGS.IS_GUEST]
      });
    }
    return result;
  },

  countByUserAndEvent(chatId, eventId) {
    const data = SheetCache.data(SHEET_NAMES.REGS);
    const uid  = chatId.toString();
    const eid  = eventId.toString();
    return data.filter(row =>
      row[COL.REGS.CHAT_ID].toString()  === uid &&
      row[COL.REGS.EVENT_ID].toString() === eid
    ).length;
  },

  getUserStatus(chatId, eventId) {
    const data   = SheetCache.data(SHEET_NAMES.REGS);
    const uid    = chatId.toString();
    const eid    = eventId.toString();
    const result = { isMe: false, guestCount: 0 };

    data.forEach(row => {
      if (row[COL.REGS.CHAT_ID].toString()  !== uid) return;
      if (row[COL.REGS.EVENT_ID].toString() !== eid) return;
      if (row[COL.REGS.IS_GUEST] === 'YES') result.guestCount++;
      else result.isMe = true;
    });

    return result;
  },

  getParticipants(eventId) {
    return this.getByEvent(eventId).map(reg => ({
      name:        reg.name,
      status:      reg.status,
      username:    reg.username,
      isGuest:     reg.isGuest,
      isConfirmed: reg.confirmation === STATUSES.CONFIRMED ||
                   reg.confirmation === '✅ Буду точно'
    }));
  },

  add(chatId, eventId, name, isGuest = false) {
    const event = EventRepository.findById(eventId);
    if (!event) return { status: 'ERROR' };

    const regs  = this.getByEvent(eventId);
    const count = regs.length;
    const max   = parseInt(event.maxPeople) || 0;
    const total = max + RESERVE_LIMIT;

    let status;
    if (max === 0) {
      status = STATUSES.MAIN;
    } else if (count < max) {
      status = STATUSES.MAIN;
    } else if (count < total) {
      status = STATUSES.RESERVE;
    } else {
      return { status: 'FULL' };
    }

    const user = UserRepository.find(chatId) || { username: 'no_link', firstName: 'Unknown' };

    try {
      const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
      sheet.appendRow([
        chatId.toString(),
        eventId.toString(),
        name,
        new Date(),
        status,
        user.username,
        user.firstName,
        isGuest ? 'YES' : 'NO',
        ''
      ]);
      SheetCache.invalidate(SHEET_NAMES.REGS);

      if (max > 0 && (count + 1) >= total) {
        EventRepository.updateStatus(eventId, STATUSES.CLOSED);
      }

      return { status };
    } catch (e) {
      console.error('RegRepository.add error: ' + e);
      return { status: 'ERROR' };
    }
  },

  remove(chatId, eventId, isGuest) {
    const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
    const uid   = chatId.toString();
    const eid   = eventId.toString();

    const data  = sheet.getDataRange().getValues();
    let removed = false;

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][COL.REGS.CHAT_ID].toString()  !== uid) continue;
      if (data[i][COL.REGS.EVENT_ID].toString() !== eid) continue;
      if ((data[i][COL.REGS.IS_GUEST] === 'YES') !== isGuest) continue;

      sheet.deleteRow(i + 1);
      removed = true;
      break;
    }

    if (removed) {
      SheetCache.invalidate(SHEET_NAMES.REGS);
      this._afterRemove(eventId);
    }

    return removed;
  },

  removeByIndex(eventId, participantIndex) {
    const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
    const data  = sheet.getDataRange().getValues();
    const eid   = eventId.toString();

    const eventRowIndices = [];
    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.REGS.EVENT_ID] &&
          data[i][COL.REGS.EVENT_ID].toString().trim() === eid) {
        eventRowIndices.push(i);
      }
    }

    if (participantIndex < 0 || participantIndex >= eventRowIndices.length) return false;

    sheet.deleteRow(eventRowIndices[participantIndex] + 1);
    SheetCache.invalidate(SHEET_NAMES.REGS);
    this._afterRemove(eventId);
    return true;
  },

  removeByName(eventId, participantName) {
    const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
    const data  = sheet.getDataRange().getValues();
    const eid   = eventId.toString();

    for (let i = data.length - 1; i >= 1; i--) {
      if (data[i][COL.REGS.EVENT_ID].toString() !== eid) continue;
      if (data[i][COL.REGS.NAME] !== participantName) continue;

      sheet.deleteRow(i + 1);
      SheetCache.invalidate(SHEET_NAMES.REGS);
      this._afterRemove(eventId);
      return true;
    }
    return false;
  },

  setConfirmation(chatId, eventId, status) {
    const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
    const data  = SheetCache.data(SHEET_NAMES.REGS);
    const uid   = chatId.toString();
    const eid   = eventId.toString();

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.REGS.CHAT_ID].toString()  === uid &&
          data[i][COL.REGS.EVENT_ID].toString() === eid) {
        sheet.getRange(i + 1, COLUMNS.REGS.CONFIRMATION).setValue(status);
      }
    }
    SheetCache.invalidate(SHEET_NAMES.REGS);
  },

  _afterRemove(eventId) {
    this._promoteFromReserve(eventId);

    const event = EventRepository.findById(eventId);
    if (!event || !event.maxPeople || parseInt(event.maxPeople) === 0) return;

    const totalLimit   = parseInt(event.maxPeople) + RESERVE_LIMIT;
    const currentCount = this.getByEvent(eventId).length;

    if (currentCount < totalLimit && event.status === STATUSES.CLOSED) {
      EventRepository.updateStatus(eventId, STATUSES.OPEN);
    }
  },

  _promoteFromReserve(eventId) {
    const sheet = SheetCache.sheet(SHEET_NAMES.REGS);
    const data  = sheet.getDataRange().getValues();
    const event = EventRepository.findById(eventId);
    if (!event) return null;

    const max = parseInt(event.maxPeople);
    if (!max) return null;

    const eid       = eventId.toString();
    const mainCount = data.filter(row =>
      row[COL.REGS.EVENT_ID].toString() === eid &&
      row[COL.REGS.STATUS] === STATUSES.MAIN
    ).length;

    if (mainCount >= max) return null;

    for (let i = 1; i < data.length; i++) {
      if (data[i][COL.REGS.EVENT_ID].toString() !== eid) continue;
      if (data[i][COL.REGS.STATUS] !== STATUSES.RESERVE) continue;

      sheet.getRange(i + 1, COLUMNS.REGS.STATUS).setValue(STATUSES.MAIN);
      SheetCache.invalidate(SHEET_NAMES.REGS);

      const ownerChatId = data[i][COL.REGS.CHAT_ID].toString();
      const name        = data[i][COL.REGS.NAME];
      const isGuest     = data[i][COL.REGS.IS_GUEST] === 'YES';

      try {
        const text = isGuest
          ? `🔥 *Хорошие новости!*\n\nТвой гость *${name}* переведён из резерва в основной состав на:\n${event.type} *"${event.title}"*`
          : Texts.promotedText(event);
        sendMsg(ownerChatId, text, Keyboards.confirmParticipation(eventId));
      } catch (e) {
        console.error('Ошибка уведомления при промоуте: ' + e);
      }

      return ownerChatId;
    }

    return null;
  }
};

const db = {

  // --- Users ---
  registerUser(chatId, from)        { return UserRepository.register(chatId, from); },
  getAllUsers()                      { return UserRepository.getAllChatIds(); },

  // --- States ---
  getState(chatId)                  { return StateRepository.get(chatId); },
  setState(chatId, state, tempData) { return StateRepository.set(chatId, state, tempData); },
  resetState(chatId)                { return StateRepository.reset(chatId); },

  // --- Events ---
  getActiveEvents()                 { return EventRepository.getActive(); },
  getEventById(id)                  { return EventRepository.findById(id); },
  updateEventStatus(id, status)     { return EventRepository.updateStatus(id, status); },
  archiveEvent(id)                  { return EventRepository.archive(id); },
  updateEventMax(id, max)           { return EventRepository.updateMax(id, max); },
  updateEventField(id, field, val)  { return EventRepository.updateField(id, field, val); },
  markReminderSent(id)              { return EventRepository.markReminderSent(id); },
  createEvent(data)                 { return EventRepository.create(data); },

  // --- Registrations ---
  addRegistration(chatId, eventId, name, isGuest) {
    return RegRepository.add(chatId, eventId, name, isGuest);
  },
  removeRegistration(chatId, eventId, isGuest) {
    return RegRepository.remove(chatId, eventId, isGuest);
  },
  removeParticipantById(eventId, name) {
    return RegRepository.removeByName(eventId, name);
  },
  removeParticipantByIndex(eventId, index) {
    return RegRepository.removeByIndex(eventId, index);
  },
  getParticipants(eventId)          { return RegRepository.getParticipants(eventId); },
  getUserRegistrations(chatId)      { return RegRepository.getByUser(chatId); },
  getUserRegCountForEvent(chatId, eventId) {
    return RegRepository.countByUserAndEvent(chatId, eventId);
  },
  getUserStatusForEvent(chatId, eventId) {
    return RegRepository.getUserStatus(chatId, eventId);
  },
  setConfirmation(chatId, eventId, status) {
    return RegRepository.setConfirmation(chatId, eventId, status);
  },

  // --- Служебное ---
  _sheet(name)    { return SheetCache.sheet(name); },
  clearCache()    { SheetCache.clear(); }
};